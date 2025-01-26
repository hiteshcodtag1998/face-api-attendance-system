const express = require('express');
const multer = require('multer');
const faceapi = require('face-api.js');
const canvas = require('canvas');  // Make sure node-canvas is correctly required
const { Canvas, Image, ImageData } = canvas;  // Get Image and ImageData from canvas

const fs = require('fs');

// Monkey patching face-api.js to work with node-canvas
// Apply monkey patch to face-api.js to use canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const app = express();
const port = 5000;

// In-memory storage for registered face descriptors
let registeredFaces = []; // Array to store registered face descriptors

// Set up Multer for image upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// Load face-api models
const MODEL_URL = './models';
async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_URL);
    // await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL);
}

// Ensure models are loaded before processing
loadModels().then(() => console.log("Models loaded successfully"));

async function processImage(imgPath) {
    try {
        // Ensure the image path exists
        if (!fs.existsSync(imgPath)) {
            console.error("Image path does not exist");
            return;
        }

        // Load the image using node-canvas
        const img = await loadImage(imgPath);

        // Create a canvas and draw the image on it
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // Convert node-canvas to a format that face-api.js understands
        const htmlCanvas = canvas;  // node-canvas is already in the right format

        // Perform face detection with face-api.js
        // const detections = await faceapi.detectSingleFace(htmlCanvas)  // Pass the canvas directly
        //     .withFaceLandmarks()
        //     .withFaceDescriptor();

        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 160, // Adjust the size of the input image, smaller sizes are faster but less accurate
            scoreThreshold: 0.5 // Minimum confidence score for a detection
        });

        const detections = await faceapi.detectSingleFace(htmlCanvas, options)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detections) {
            console.error('No face detected');
            return null;
        }

        console.log("Face Detected:", detections);
        return detections;

    } catch (error) {
        console.error("Error processing image:", error);
    }
}



// API to register a user's face
app.post('/register', upload.single('image'), async (req, res) => {
    try {
        console.log('req.file.path', req.file.path)

        // Ensure the path is correct and accessible
        const imgPath = path.join(__dirname, 'uploads', req.file.filename).replace(/\\/g, '/');

        console.log('imgPath', imgPath)

        // Synchronously check if the file exists
        if (fs.existsSync(imgPath)) {
            console.log('File exists');
        } else {
            console.log('File does not exist');
        }

        // Process the image and get detections
        const detections = await processImage(imgPath);

        if (!detections) {
            return res.status(400).send('No face detected');
        }

        // Store face descriptor for later comparison
        registeredFaces.push({
            descriptor: detections.descriptor,
            fileName: req.file.filename, // Optional: store filename or other details
        });

        res.status(200).send('User registered successfully');
    } catch (error) {
        console.log('---Error: ', error)
        res.status(500).send('Error processing the image');
    } finally {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Failed to delete uploaded file:', err);
        });
    }
});

// API to upload and match a face
app.post('/match', upload.single('image'), async (req, res) => {
    try {
        const img = await canvas.loadImage(req.file.path);

        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 160, // Adjust the size of the input image, smaller sizes are faster but less accurate
            scoreThreshold: 0.5 // Minimum confidence score for a detection
        });

        const detections = await faceapi.detectSingleFace(img, options)
            .withFaceLandmarks()
            .withFaceDescriptor();


        // const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (!detections) {
            return res.status(400).send('No face detected');
        }

        // Compare the uploaded face descriptor with the registered faces
        let matchedStudent = null;
        for (const registeredFace of registeredFaces) {
            const distance = faceapi.euclideanDistance(detections.descriptor, registeredFace.descriptor);

            // If distance is small enough, consider it a match
            if (distance < 0.4) { // You can adjust this threshold for sensitivity
                matchedStudent = registeredFace;
                break;
            }
        }

        if (matchedStudent) {
            res.status(200).send(`Face recognized: ${matchedStudent.fileName}`);
        } else {
            res.status(400).send('Face not recognized');
        }
    } catch (error) {
        res.status(500).send('Error processing the image');
    } finally {
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('Failed to delete uploaded file:', err);
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
