const express = require("express"); const http = require("http"); const { Server } = require("socket.io");
const app = express(); const server = http.createServer(app); const io = new Server(server);
app.use(express.static("."));

// Route for homepage
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// IMPORTANT for Render
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(Server running on port ${PORT});
});

let settings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  autoStartBreaks: false,
  autoStartPomodoros: false
};
// Default times (in seconds) 
let modes = { pomodoro: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
let currentMode = "pomodoro"; let timeLeft = modes[currentMode]; let isRunning = false;
// Timer loop 
setInterval(() => { if (!isRunning) return;
timeLeft--;
if (timeLeft <= 0) {
io.emit("timeUp"); // 🔔 send alarm

// Auto switch 
if (currentMode === "pomodoro") {
  currentMode = "shortBreak";
} else if(currentMode === "shortBreak"){
    currentMode = "pomodoro"
} else if (currentMode === "longBreak"){
    currentMode = "pomodoro";
}

timeLeft = modes[currentMode];


if (
    (currentMode === "shortBreak" || currentMode === "longBreak") &&
    settings.autoStartBreaks
  ) {
    isRunning = true;
  } else if (
    currentMode === "pomodoro" &&
    settings.autoStartPomodoros
  ) {
    isRunning = true;
  } else {
    isRunning = false;
  }
}
io.emit("timer", { timeLeft, currentMode, isRunning });
}, 1000);
// Socket connection 
io.on("connection", (socket) => {
socket.emit("timer", { timeLeft, currentMode, isRunning });
socket.on("start", () => isRunning = true); socket.on("pause",() => isRunning = false);
socket.on("changeMode", (mode) => {
  currentMode = mode;
  timeLeft = modes[mode];
  isRunning = false;
})
socket.on("updateTime", ({ pomodoro, shortBreak, longBreak }) => { modes.pomodoro = pomodoro * 60; modes.shortBreak = shortBreak * 60; modes.longBreak = longBreak * 60;
currentMode = "pomodoro";
timeLeft = modes[currentMode];
isRunning = false;
});
socket.on("updateSettings", (data) => {
  settings = data;

  modes.pomodoro = data.pomodoro * 60;
  modes.shortBreak = data.shortBreak * 60;
  modes.longBreak = data.longBreak * 60;

  currentMode = "pomodoro";
  timeLeft = modes[currentMode];
  isRunning = false;
});
});
server.listen(3000, () => { console.log("Server running at http://localhost:3000"); });
