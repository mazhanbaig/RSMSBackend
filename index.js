require('dotenv').config()
const express = require("express");
const cors = require("cors");
const paymentRoutes = require("./routes/payment");
const authRoutes = require("./routes/auth");
const dataRoutes = require("./routes/data");
const imageRoutes = require("./routes/images");

const app = express();

app.use(cors({
    origin: ['http://localhost:3000', 'https://zstate.vercel.app'],
    credentials: true
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/payment", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/images", imageRoutes);

app.listen('5000', () => {
    
})

module.exports = app;


//  eyJhbGciOiJSUzI1NiIsImtpZCI6IjJhYWM0MWY3NTA4OGZlOGUwOWEwN2Q0NDRjZmQ2YjhjZTQ4MTJhMzEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiTXVoYW1tYWQgQXpoYW4gQmFpZyIsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NJVFlIMVVNSllTbnpvQXpRcmZUaFYxUy1oWjRUdFg3NzNpUl9uMWE4bjFKQzRjLUE9czk2LWMiLCJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vcnNtcy01ZDEyMiIsImF1ZCI6InJzbXMtNWQxMjIiLCJhdXRoX3RpbWUiOjE3NzIyNjcwMzIsInVzZXJfaWQiOiI5TVZvMmpkOUtGV0FiRkprRnJGVW9PQTVpZ0QyIiwic3ViIjoiOU1WbzJqZDlLRldBYkZKa0ZyRlVvT0E1aWdEMiIsImlhdCI6MTc3MjI3NjAxOCwiZXhwIjoxNzcyMjc5NjE4LCJlbWFpbCI6Im1hemhhbmJhaWc0NEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwiZmlyZWJhc2UiOnsiaWRlbnRpdGllcyI6eyJnb29nbGUuY29tIjpbIjExMjQwODA5MTY1NTcyNDM2NjY0NSJdLCJlbWFpbCI6WyJtYXpoYW5iYWlnNDRAZ21haWwuY29tIl19LCJzaWduX2luX3Byb3ZpZGVyIjoiZ29vZ2xlLmNvbSJ9fQ.pescuT7rdX3Rct0NQcyIUZXo-KFV_3wTX0XTEPri8Ze2rQZg0pheBxf2OorRV1VLOAOa4pnUct4ZpoSUvCt-UmOQjx6g5dEwgMH_dFxuYnrmzD1msL-OjP11ZbsLpiMXGjeU99mAeuSxLYdFsgcJFhINwR05RKLoazO6zcywZby4X7pfg_9Vtk5OsaSt1EK4himcidxgUfFJnq8RoImU9wyn_JfMSOrdrLF5AGq2dO4zKpY3DAG6NzswI_Ta_LYoVlqZ5_MLbFRVFdlMg8Pa3JAIa1a7rx-aUNmOC83erXrDz6qeZm58BdJYEEtCcyHP4DsWvYgYkuW4qDikoj1L0g