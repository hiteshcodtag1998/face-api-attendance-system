# Face Recognition API

This project is a simple Express.js API for registering and matching faces using the `face-api.js` library and `node-canvas`. The API allows users to upload images for face registration and later upload images for face matching.

## Technologies Used
- **Node.js**
- **Express.js**
- **Multer** (for file uploads)
- **face-api.js** (for face detection and recognition)
- **node-canvas** (to provide a canvas environment for `face-api.js`)

## Requirements
- Node.js (v14 or later)
- `face-api.js` models (e.g., TinyFaceDetector, FaceRecognitionNet, and FaceLandmark68Net)

## Installation

### 1. Clone the repository
```bash
git clone https://github.com/StudentHitesh/face-api-attendance-system.git
cd face-api-attendance-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Download face-api.js models
```bash
Download the pre-trained models for face detection and recognition and place them in the models directory. You can get the models from the official https://github.com/justadudewhohacks/face-api.js/tree/master/weights
```

### 4. Start the server
```bash
npm start
```