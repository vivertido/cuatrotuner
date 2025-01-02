# Cuatro Tuner Web App

The Cuatro Tuner Web App is designed to help you tune a Cuatro Venezolano, a four-string instrument similar to a ukulele that originates from Venezuela. This web app detects the frequencies of the four strings and provides visual feedback to help you tune each string accurately.

## Features

- **Real-time Frequency Detection**: Uses the microphone to detect the frequency of the sound being played.
- **Visual Feedback**: Displays the detected frequency and note, and shows how close the pitch is to the target frequency.
- **String Labels**: Indicates which string is being tuned and provides feedback on whether it is in tune.
- **Progress Bars**: Shows the tuning progress for each string.
- **Chime Sound**: Plays a chime sound when a string is tuned correctly.

## Getting Started

### Prerequisites

- A modern web browser that supports the Web Audio API.
- A microphone to capture the sound of the Cuatro strings.

### Installation

1. Clone the repository or download the source code.
2. Open `index.html` in your web browser.

### Usage

1. Open the web app in your browser.
2. Click the "Start Tuning" button to begin.
3. Play a string on your Cuatro.
4. The app will display the detected frequency and note, and provide feedback on how close the pitch is to the target frequency.
5. Adjust the tuning of the string until the app indicates that it is "In tune".
6. Repeat for each string.
7. Click the "Stop Tuning" button to stop the tuner.

## File Structure

- `index.html`: The main HTML file that contains the structure of the web app.
- `tuner.js`: The JavaScript file that handles the frequency detection and tuning logic.
- `assets/`: Directory containing additional assets such as the chime sound.
- `README.md`: This file.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you have any suggestions or improvements.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.


## Contact

For any questions or feedback, please contact [your-email@example.com].

