# StudySignal

StudySignal is a cloud-powered web app that helps students quickly find quiet places to study on campus.

Users can view the current crowd level at study locations and submit reports to update the status.

The app is built using a serverless architecture on AWS.

---

## Features

- View current crowd levels at study locations
- Submit crowd reports
- Data stored in a cloud database
- Serverless backend with AWS Lambda
- Public API using API Gateway

Crowd levels:

🟢 Quiet  
🟡 Medium  
🔴 Busy

---

## Architecture

# StudySignal

StudySignal is a cloud-powered web app that helps students quickly find quiet places to study on campus.

Users can view the current crowd level at study locations and submit reports to update the status.

The app is built using a serverless architecture on AWS.

---

## Features

- View current crowd levels at study locations
- Submit crowd reports
- Data stored in a cloud database
- Serverless backend with AWS Lambda
- Public API using API Gateway

Crowd levels:

🟢 Quiet  
🟡 Medium  
🔴 Busy

---

## Architecture

---
React Frontend
↓
API Gateway
↓
AWS Lambda
↓
DynamoDB

The frontend sends requests to AWS API Gateway, which triggers Lambda functions that read or update data in DynamoDB.

---

## Tech Stack

Frontend:
- React
- Vite

Backend:
- AWS Lambda
- Amazon API Gateway

Database:
- Amazon DynamoDB

Infrastructure:
- AWS Serverless Architecture

---

## Project Structure

---
study-signal/
│
├── src/
│ ├── App.jsx
│ ├── App.css
│ └── main.jsx
│
├── index.html
├── package.json
└── README.md

---

## Future Improvements

- Interactive campus map with color-coded pins
- Real-time updates
- Mobile-friendly UI
- More study locations
- Crowd history analytics

---

## Author

Adalberto Gonzalez-Mendoza