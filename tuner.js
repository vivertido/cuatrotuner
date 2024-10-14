// Select the Start button and output elements
const startButton = document.getElementById('start-button');
const stopButton = document.getElementById('stop-button');
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

// Variable to store the last valid frequency and target frequency
let lastValidFrequency = null;
let lastValidTargetFrequency = null;

const canvas = document.getElementById('tuner-canvas');
const ctx = canvas.getContext('2d');
// Adjust for the new canvas size (center and radius)
const canvasCenterX = 200;  // Half of the 400px width
const canvasCenterY = 200;  // Half of the 400px height
const dialRadius = 160;     // Slightly smaller than the canvas


const chimeSound = document.getElementById('chime-sound');
const stringLabels = {
    "A3": document.getElementById('string-A3'),
    "D4": document.getElementById('string-D4'),
    "F#4": document.getElementById('string-F#4'),
    "B3": document.getElementById('string-B3')
};

// Keep track of which strings have been tuned
const tunedStrings = {
    "A3": false,
    "D4": false,
    "F#4": false,
    "B3": false
};

const progressBars = {
    "A3": document.getElementById('progress-A3'),
    "D4": document.getElementById('progress-D4'),
    "F#4": document.getElementById('progress-F#4'),
    "B3": document.getElementById('progress-B3')
};


// Function to draw the dial and needle
function drawDial(centsOff) {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw the dial circle
    ctx.beginPath();
    ctx.arc(canvasCenterX, canvasCenterY, dialRadius, 0, 2 * Math.PI);  // Use new center and radius
    ctx.stroke();

    // Draw the tick marks on the dial
    for (let i = -50; i <= 50; i += 10) {  // Ranges from -50 cents to +50 cents
        const angle = (i + 90) * Math.PI / 180;  // Convert degree to radians
        const x1 = canvasCenterX + (dialRadius - 20) * Math.cos(angle);  // Start of the tick mark
        const y1 = canvasCenterY + (dialRadius - 20) * Math.sin(angle);
        const x2 = canvasCenterX + dialRadius * Math.cos(angle);  // End of the tick mark
        const y2 = canvasCenterY + dialRadius * Math.sin(angle);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    // Draw the needle based on how many cents off the detected frequency is
    drawNeedle(centsOff);
}

// Function to draw the needle on the dial
function drawNeedle(centsOff) {
    const angle = (centsOff + 90) * Math.PI / 180;  // Convert degree to radians
    const needleLength = dialRadius - 40;  // Set needle length smaller than dial radius
    const x = canvasCenterX + needleLength * Math.cos(angle);
    const y = canvasCenterY + needleLength * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(canvasCenterX, canvasCenterY);  // Start from the center
    ctx.lineTo(x, y);  // Draw the needle
    ctx.strokeStyle = "red";
    ctx.lineWidth = 3;
    ctx.stroke();
}

function detectPitch() {
    analyser.getFloatTimeDomainData(dataArray);  // Get audio data from the microphone

    const frequency = autoCorrelate(dataArray, audioContext.sampleRate);

    if (frequency !== -1) {
        const result = getStringAndTuningStatus(frequency);

        // Only update the UI if the target frequency is valid and greater than 0
        if (result.targetFrequency > 0) {
            lastValidFrequency = frequency;  // Store the last valid frequency
            lastValidTargetFrequency = result.targetFrequency;  // Store the last valid target frequency

            // Update the frequency and note display
            frequencyDisplay.innerText = frequency.toFixed(2);
            noteDisplay.innerText = `${result.string}: ${result.status}`;

            // Calculate and display cents off
            const centsOff = getCentsOff(frequency, result.targetFrequency);
            drawDial(centsOff);  // Move the needle based on centsOff

             // Update progress bar based on how close the pitch is
            const progressValue = 100 - Math.min(100, Math.abs(centsOff) * 2);  // Convert centsOff to percentage
            progressBars[result.string].value = progressValue;
 


            // Check the tuning status and update label color based on "in tune" status
            if (result.status === "In tune" && !tunedStrings[result.string]) {
                tunedStrings[result.string] = true;  // Mark string as tuned
                stringLabels[result.string].classList.add('tuned');  // Change label to green
                chimeSound.play();  // Play the chime sound
                console.log(`String ${result.string} is tuned`);
            }
        } else if (lastValidFrequency !== null && lastValidTargetFrequency !== null) {
            // If the current frequency is invalid, fall back to the last valid one
            const centsOff = getCentsOff(lastValidFrequency, lastValidTargetFrequency);
            drawDial(centsOff);  // Keep the needle in place
        }
    } else if (lastValidFrequency !== null && lastValidTargetFrequency !== null) {
        // If no pitch is detected, maintain the last valid frequency and needle position
        const centsOff = getCentsOff(lastValidFrequency, lastValidTargetFrequency);
        drawDial(centsOff);  // Keep the needle steady
    } else {
        frequencyDisplay.innerText = "0";
        noteDisplay.innerText = "N/A";
        drawDial(0);  // Reset the needle if no valid frequency is available
    }

    if (isTuning) {
        requestAnimationFrame(detectPitch);
    }
}

// Function to calculate how many cents off the frequency is
function getCentsOff(frequency, targetFrequency) {

   // console.log("Freq: " + frequency);
    //console.log("target: " + targetFrequency)

    if (frequency <= 0 || targetFrequency <= 0 || frequency > 1000) {
        return 0;  // Ignore invalid or extremely high frequencies
    }
    return 1200 * Math.log2(frequency / targetFrequency);
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

    startButton.style.display = 'none';  // Hide Start button
    stopButton.style.display = 'inline';  // Show Stop button

    // Initialize AudioContext
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    try {
        // Get access to the user's microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Create a MediaStreamAudioSourceNode from the microphone input
        microphone = audioContext.createMediaStreamSource(stream);

        const lowPassFilter = audioContext.createBiquadFilter();
        lowPassFilter.type = "lowpass";
        lowPassFilter.frequency.value = 300;  // Cutoff frequency: only allow frequencies below 300Hz
        
        // Create an AnalyserNode
        analyser = audioContext.createAnalyser();
        analyser.fftSize = bufferLength;  // Increase this for better frequency resolution
        
        // Connect the microphone input to the low-pass filter, then to the analyser
        microphone.connect(lowPassFilter);
        lowPassFilter.connect(analyser);  // Filtered signal goes to the analyser

        detectPitch();  // Start pitch detection
        // Log success
        console.log("Microphone connected, audio context running.");

    } catch (error) {
        console.error("Error accessing microphone:", error);
        alert("Microphone access denied.");
        isTuning = false;
    }
}

// Function to stop tuning
function stopTuning() {
    if (!isTuning) {
        return;  // Already stopped
    }
    isTuning = false;

    startButton.style.display = 'inline';  // Show Start button
    stopButton.style.display = 'none';  // Hide Stop button

    if (audioContext) {
        audioContext.close();  // Close the audio context to stop processing
    }

    frequencyDisplay.innerText = "0";  // Reset frequency display
    noteDisplay.innerText = "N/A";  // Reset note display
    drawDial(0);  // Reset the dial to center

    // Reset all string labels back to gray
    Object.keys(tunedStrings).forEach(string => {
        stringLabels[string].classList.remove('tuned');  // Remove green color
        tunedStrings[string] = false;  // Mark all strings as untuned
    });
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
    return { string: "N/A", targetFrequency: 0, status: "Out of range" };
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

    return { string, targetFrequency, status };
}

// Event listener for the Start button
startButton.addEventListener('click', startTuning);
stopButton.addEventListener('click', stopTuning);



// Function to resize the canvas for high DPI screens
function resizeCanvasForHighDPI() {
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.getElementById('tuner-canvas');
    
    // Set the canvas dimensions based on the device pixel ratio
    canvas.width = 400 * dpr;
    canvas.height = 400 * dpr;
    
    // Scale the drawing context so everything is drawn correctly
    ctx.scale(dpr, dpr);

    // Set the CSS dimensions (logical pixels, not device pixels)
    canvas.style.width = '400px';
    canvas.style.height = '400px';
}

resizeCanvasForHighDPI();

drawDial(0);