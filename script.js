const socket = io();

// ================= STATE =================
let running = false;
let timer = null;
let time = 1500;
let currentMode = "work";

let tasks = [];
let selectedTaskIndex = null;

let pomodoroCount = 0;
let longBreakInterval = 4;

// ================= ELEMENTS =================
const alarm = document.getElementById("alarmSound");
const timerDisplay = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");

const autoBreak = document.getElementById("autoBreak");
const autoPomodoro = document.getElementById("autoPomodoro");

const addTaskBtn = document.getElementById("addTaskBtn");
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");

const taskNameInput = document.getElementById("taskNameInput");
const taskSessionsInput = document.getElementById("taskSessionsInput");
const addNoteBtn = document.getElementById("addNoteBtn");
const taskNote = document.getElementById("taskNote");

const deleteBtn = document.getElementById("deleteBtn");

// ================= 🔔 NOTIFICATIONS =================
if ("Notification" in window) {
  Notification.requestPermission();
}

// ================= 🔊 AUDIO FIX =================
document.addEventListener("click", () => {
  alarm.play().then(() => {
    alarm.pause();
    alarm.currentTime = 0;
  });
}, { once: true });

// ================= DISPLAY =================
function updateDisplay() {
  const min = Math.floor(time / 60);
  const sec = time % 60;
  timerDisplay.innerText = `${min}:${sec < 10 ? "0" : ""}${sec}`;
}

// ================= 🔔 ALERT FUNCTION =================
function triggerAlert() {
  // 🔊 Sound
  alarm.currentTime = 0;
  alarm.play();

  // 📳 Vibration (mobile)
  if (navigator.vibrate) {
    navigator.vibrate([300, 200, 300]);
  }

  // 🔔 Notification
  if (Notification.permission === "granted") {
    new Notification("⏰ Time's up!", {
      body:
        currentMode === "work"
          ? "Pomodoro finished! Take a break."
          : "Break over! Back to work 💪",
    });
  }
}

// ================= TIMER =================
function startTimer() {
  if (running) return;

  running = true;
  startBtn.textContent = "Pause";

  timer = setInterval(() => {
    time--;
    updateDisplay();

    if (time <= 0) {
      clearInterval(timer);
      timer = null;
      running = false;
      startBtn.textContent = "Start";

      // 🔔 ALL ALERTS
      triggerAlert();

      // update task progress
      if (currentMode === "work" && selectedTaskIndex !== null) {
        let task = tasks[selectedTaskIndex];
        if (task.done < task.total) {
          task.done++;
          saveTasks();
          renderTasks();
        }
      }

      // ================= AUTO SWITCH =================
      if (currentMode === "work") {
        pomodoroCount++;

        if (pomodoroCount % longBreakInterval === 0) {
          setMode("long");
        } else {
          setMode("short");
        }

        if (autoBreak.checked) {
          setTimeout(() => startTimer(), 300);
        }
      } else {
        setMode("work");

        if (autoPomodoro.checked) {
          setTimeout(() => startTimer(), 300);
        }
      }
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);
  timer = null;
  running = false;
  startBtn.textContent = "Start";
}

// ================= BUTTON =================
startBtn.addEventListener("click", () => {
  running ? pauseTimer() : startTimer();
});

// ================= MODES =================
function setMode(mode) {
  currentMode = mode;

  document.querySelectorAll(".tabs button").forEach(btn =>
    btn.classList.remove("active")
  );
  document.getElementById(mode + "Btn").classList.add("active");

  document.body.classList.remove("pomodoro", "shortBreak", "longBreak");

  if (timer) clearInterval(timer);

  running = false;
  startBtn.textContent = "Start";

  if (mode === "work") {
    time =
      (localStorage.getItem("pomodoro") ||
        document.getElementById("pomodoroInput").value ||
        25) * 60;
    document.body.classList.add("pomodoro");
  } else if (mode === "short") {
    time =
      (localStorage.getItem("short") ||
        document.getElementById("shortInput").value ||
        5) * 60;
    document.body.classList.add("shortBreak");
  } else {
    time =
      (localStorage.getItem("long") ||
        document.getElementById("longInput").value ||
        15) * 60;
    document.body.classList.add("longBreak");
  }

  updateDisplay();
}

// ================= MODE BUTTONS =================
document.getElementById("workBtn").onclick = () => setMode("work");
document.getElementById("shortBtn").onclick = () => setMode("short");
document.getElementById("longBtn").onclick = () => setMode("long");

// ================= SETTINGS =================
function openSettings() {
  document.getElementById("settingsModal").classList.remove("hidden");
}

function closeSettings() {
  document.getElementById("settingsModal").classList.add("hidden");
}

document.getElementById("saveSettings").addEventListener("click", () => {
  const pomodoro = document.getElementById("pomodoroInput").value;
  const short = document.getElementById("shortInput").value;
  const long = document.getElementById("longInput").value;
  const interval = document.getElementById("intervalInput").value;

  localStorage.setItem("pomodoro", pomodoro);
  localStorage.setItem("short", short);
  localStorage.setItem("long", long);
  localStorage.setItem("interval", interval);

  longBreakInterval = parseInt(interval) || 4;

  closeSettings();
  setMode(currentMode);
});

// ================= LOAD SETTINGS =================
(function loadSettings() {
  const p = localStorage.getItem("pomodoro");
  const s = localStorage.getItem("short");
  const l = localStorage.getItem("long");
  const i = localStorage.getItem("interval");

  if (p) document.getElementById("pomodoroInput").value = p;
  if (s) document.getElementById("shortInput").value = s;
  if (l) document.getElementById("longInput").value = l;

  if (i) {
    document.getElementById("intervalInput").value = i;
    longBreakInterval = parseInt(i);
  }
})();

// ================= TASK STORAGE =================
function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

// ================= TASK UI =================
addTaskBtn.addEventListener("click", () => {
  addTaskBtn.style.display = "none";
  taskForm.classList.remove("hidden");

  selectedTaskIndex = null;
  deleteBtn.classList.add("hidden");

  taskNameInput.value = "";
  taskSessionsInput.value = 0;

  taskForm.scrollIntoView({ behavior: "smooth", block: "center" });
});

function cancelTask() {
  taskForm.classList.add("hidden");
  addTaskBtn.style.display = "block";

  selectedTaskIndex = null;
  deleteBtn.classList.add("hidden");
}

function saveTask() {
  const name = taskNameInput.value.trim();
  const sessions = parseInt(taskSessionsInput.value);

  if (!name) return alert("Enter task name");

  if (selectedTaskIndex !== null) {
    tasks[selectedTaskIndex].name = name;
    tasks[selectedTaskIndex].total = sessions;
  } else {
    tasks.push({ name, total: sessions, done: 0 });
  }

  saveTasks();
  renderTasks();
  cancelTask();
}

function deleteTask() {
  if (selectedTaskIndex === null) return;
  if (!confirm("Delete this task?")) return;

  tasks.splice(selectedTaskIndex, 1);

  saveTasks();
  renderTasks();
  cancelTask();
}

// ================= LOAD TASKS =================
(function loadTasks() {
  const saved = localStorage.getItem("tasks");
  if (saved) {
    tasks = JSON.parse(saved);
    renderTasks();
  }
})();

// ================= FINISH TIME =================
function calculateFinishTime(sessions) {
  const minutes =
    localStorage.getItem("pomodoro") ||
    document.getElementById("pomodoroInput").value ||
    25;

  const now = new Date();
  now.setMinutes(now.getMinutes() + sessions * minutes);

  return `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
}

// ================= RENDER =================
function renderTasks() {
  taskList.innerHTML = "";

  tasks.forEach((task, index) => {
    const div = document.createElement("div");
    div.className = "task-card";

    div.innerHTML = `
      <div class="task-top">
        <span class="task-name">${task.name}</span>
        <span class="menu-btn">⋮</span>
      </div>
      <div class="task-bottom">
        <span>Pomos: ${task.done} / ${task.total}</span>
        <span>Finish at: ${calculateFinishTime(task.total)}</span>
      </div>
    `;

    div.onclick = () => {
      selectedTaskIndex = index;
      renderTasks();
    };

    div.querySelector(".menu-btn").onclick = (e) => {
      e.stopPropagation();

      addTaskBtn.style.display = "none";
      taskForm.classList.remove("hidden");

      taskNameInput.value = task.name;
      taskSessionsInput.value = task.total;

      selectedTaskIndex = index;
      deleteBtn.classList.remove("hidden");

      setTimeout(() => {
        taskForm.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    };

    taskList.appendChild(div);
  });
}

// ================= SESSION =================
function increaseSession() {
  taskSessionsInput.value = parseInt(taskSessionsInput.value) + 1;
}

function decreaseSession() {
  let val = parseInt(taskSessionsInput.value);
  if (val > 0) taskSessionsInput.value = val - 1;
}

// ================= NOTE =================
addNoteBtn.addEventListener("click", () => {
  addNoteBtn.style.display = "none";
  taskNote.classList.remove("hidden");
});

// ================= INIT =================
updateDisplay();