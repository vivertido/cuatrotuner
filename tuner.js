// Select the Start button and output elements
const startButton = document.getElementById('start-button');
const frequencyDisplay = document.getElementById('frequency-value');
const noteDisplay = document.getElementById('note-value');

// Initialize frequency buffer for moving average (store the last few frequency values)
const frequencyBuffer = [];
const bufferSize = 5;  // Number of values to average

// Initialize the AudioContext and other variables
let audioContext;
let analyser;
let microphone;
let isTuning = false;
const bufferLength = 2048;  // FFT buffer size
const dataArray = new Float32Array(bufferLength);  // Create a buffer to hold audio data


function detectPitch() {
    analyser.getFloatTimeDomainData(dataArray);  // Get audio data from the microphone

    // Perform auto-correlation to detect frequency
    const frequency = autoCorrelate(dataArray, audioContext.sampleRate);

    if (frequency !== -1) {

        const averagedFrequency = calculateMovingAverage(frequency);  // Use the moving average

        const result = getStringAndTuningStatus(averagedFrequency);

        frequencyDisplay.innerText = averagedFrequency.toFixed(2);  // Update frequency display
        noteDisplay.innerText = `${result.string}: ${result.status}`;
        // noteDisplay.innerText = frequencyToNote(frequency); // Update note display
    } else {
        frequencyDisplay.innerText = "0";
        noteDisplay.innerText = "N/A";
    }

    // Call detectPitch again for real-time analysis
    if (isTuning) {
        requestAnimationFrame(detectPitch);
    }
}

// Function to calculate the moving average of the buffer
function calculateMovingAverage(newFrequency) {
    // Add the new frequency to the buffer
    frequencyBuffer.push(newFrequency);

    // Remove the oldest value if the buffer exceeds the size limit
    if (frequencyBuffer.length > bufferSize) {
        frequencyBuffer.shift();
    }

    // Calculate and return the average frequency
    const sum = frequencyBuffer.reduce((a, b) => a + b, 0);
    return sum / frequencyBuffer.length;
}

// Function to start microphone access
async function startTuning() {
    if (isTuning) {
        return;  // Already tuning
    }
    isTuning = true;

    // Initialize AudioContext
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    try {
        // Get access to the user's microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create a MediaStreamAudioSourceNode from the microphone input
        microphone = audioContext.createMediaStreamSource(stream);
        
        // Create an AnalyserNode
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;  // Increase this for better frequency resolution
        
        // Connect the microphone input to the analyser
        microphone.connect(analyser);
        detectPitch();  // Start pitch detection
        // Log success
        console.log("Microphone connected, audio context running.");

    } catch (error) {
        console.error("Error accessing microphone:", error);
        alert("Microphone access denied.");
        isTuning = false;
    }
}

// Auto-correlation function to estimate pitch from time-domain data
function autoCorrelate(buffer, sampleRate) {
    const SIZE = buffer.length;
    let maxSamples = Math.floor(SIZE / 2);
    let bestOffset = -1;
    let bestCorrelation = 0;
    let rms = 0;
    let foundGoodCorrelation = false;
    let correlations = new Array(maxSamples);

    // Calculate root mean square (RMS) to estimate energy in the signal
    for (let i = 0; i < SIZE; i++) {
        rms += buffer[i] * buffer[i];
    }
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;  // If too little energy, return -1

    // Perform auto-correlation to detect pitch
    let lastCorrelation = 1;
    for (let offset = 0; offset < maxSamples; offset++) {
        let correlation = 0;
        for (let i = 0; i < maxSamples; i++) {
            correlation += Math.abs((buffer[i]) - (buffer[i + offset]));
        }
        correlation = 1 - (correlation / maxSamples);
        correlations[offset] = correlation;

        if (correlation > 0.9 && correlation > lastCorrelation) {
            foundGoodCorrelation = true;
            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestOffset = offset;
            }
        } else if (foundGoodCorrelation) {
            const shift = (correlations[bestOffset + 1] - correlations[bestOffset - 1]) / correlations[bestOffset];
            return sampleRate / (bestOffset + (8 * shift));
        }
        lastCorrelation = correlation;
    }
    if (bestCorrelation > 0.01) {
        return sampleRate / bestOffset;
    }
    return -1;
}

// Convert frequency to note name (simplified for demo)
function frequencyToNote(freq) {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    const semitones = 12 * (Math.log(freq / A4) / Math.log(2));
    const noteIndex = Math.round(semitones) % 12;
    return noteNames[noteIndex];
}

// Function to determine which string is being tuned and provide feedback
function getStringAndTuningStatus(frequency) {
    let string, targetFrequency, difference;

   // Define frequency ranges and target frequencies for each string
   if (frequency >= 200 && frequency <= 240) {  // A3
    string = "A3";
    targetFrequency = 220;
} else if (frequency >= 270 && frequency <= 315) {  // D4
    string = "D4";
    targetFrequency = 293.66;
} else if (frequency >= 350 && frequency <= 390) {  // F#4
    string = "F#4";
    targetFrequency = 369.99;
} else if (frequency >= 230 && frequency <= 265) {  // B3
    string = "B3";
    targetFrequency = 246.94;
} else {
    return { string: "N/A", status: "Out of range" };
}
    // Calculate the difference between detected frequency and target
    difference = frequency - targetFrequency;

    // Provide tuning feedback
    let status;
    if (difference < -5) {
        status = `Too low by ${Math.abs(difference.toFixed(2))} Hz`;
    } else if (difference > 5) {
        status = `Too high by ${Math.abs(difference.toFixed(2))} Hz`;
    } else {
        status = "In tune";
    }

    return { string, status };
}

// Event listener for the Start button
startButton.addEventListener('click', startTuning);