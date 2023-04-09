const SECOND = 1000;
const MINUTE = 60;

const SOUND_URL = "./assets/audio/metal-bowl-5.2-inch.mp3";

const CIRCLE = document.getElementById("radial-progress");
const COUNTER = document.getElementById("counter");
const LOOP_CHECKBOX = document.getElementById("loop-checkbox");
const START_BUTTON = document.getElementById("start-button");
const STOP_BUTTON = document.getElementById("stop-button");
const TIMERS_CONTAINER = document.getElementById("timers-container");

const MODAL_OVERLAY = document.getElementById("modal-overlay");
const ADD_TIMER_FORM = document.getElementById("add-timer-form");
const ADD_TIMER_BUTTON = document.getElementById("add-timer-button");
const NEW_TIMER_INPUT = document.getElementById("new-timer-input");
const OPEN_FORM_BUTTON = document.getElementById("open-form-button");

Array.prototype.shuffle = function () {
  let currentIndex = this.length,
    randomIndex;

  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [this[currentIndex], this[randomIndex]] = [
      this[randomIndex],
      this[currentIndex],
    ];
  }

  return this;
};

const infinite = function* () {
  let i = 1;

  while (true) {
    yield i++;
  }
};

const idGenerator = infinite();

const getId = () => {
  return idGenerator.next().value;
};

const COLORS = [
  "#00d1ab",
  "#ce4d81",
  "#ffd85c",
  "#0065a8",
  "#ff6360",
  "#08c501",
  "#6788ca",
  "#c4fc02",
  "#159861",
  "#00b5bd",
  "#ff5420",
  "#70d3b9",
  "#ff4363",
  "#d8ff8f",
  "#ffbd52",
  "#da6873",
].shuffle();

let wakeLock = null;

const lockScreen = async () => {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    console.log("Wake lock is active!");
  } catch (err) {
    console.log("Wake lock request failed.", err.name, err.message);
  }
};

const releaseScreen = () =>
  wakeLock.release().then(() => {
    wakeLock = null;
  });

const random = (max, min = 0) => Math.floor(Math.random() * max) + min;

class Queue {
  constructor(loop = false) {
    this.timers = [];
    this.index = 0;
    this.loop = loop;
    this.running = false;
  }

  get current() {
    return this.timers[this.index];
  }

  get currentIndex() {
    return this.index;
  }

  get canIncrement() {
    return this.index < this.timers.length - 1;
  }

  get hasNext() {
    return this.loop || this.canIncrement;
  }

  get size() {
    return this.timers.length;
  }

  add = (time) => {
    const timer = new Timer(time);
    this.timers.push(timer);
  };

  remove = (id) => {
    this.timers = this.timers.filter((t) => t.id != id);
  };

  next = () => {
    if (!this.hasNext) {
      return;
    }

    if (!this.running) {
      this.index = 0;
      this.running = true;
      return;
    }

    if (this.canIncrement) {
      this.index++;
    } else {
      this.index = 0;
    }
  };

  stop = () => {
    this.index = 0;
    this.running = false;
  };

  toggleLoop = () => (this.loop = !this.loop);
}

class Controller {
  constructor() {
    this.activeTimer = 0;
    this.interval = undefined;
    this.queue = new Queue(LOOP_CHECKBOX.checked);

    this.radialProgress = new RadialProgress();

    STOP_BUTTON.disabled = true;
  }

  get hasFinished() {
    return this.activeTimer === this.queue.current.time;
  }

  add = (time) => {
    this.queue.add(time);
    this.renderTimers();

    if (this.queue.size === 1) {
      this.updateCounter(0);
      this.render();
    }

    if (this.queue.size === COLORS.length) {
      OPEN_FORM_BUTTON.disabled = true;
    }

    START_BUTTON.disabled = this.queue.size === 0;
  };

  remove = (timerId) => {
    this.queue.remove(timerId);
    this.renderTimers();

    if (this.queue.size < COLORS.length) {
      OPEN_FORM_BUTTON.disabled = false;
    }

    if (this.queue.size === 0) {
      START_BUTTON.disabled = true;
    } else {
      this.updateCounter(0);
      this.render();
    }
  };

  start = () => {
    this.playBell();
    this.next();
    this.render();
    this.interval = setInterval(this.handleInterval, SECOND);

    START_BUTTON.disabled = true;
    STOP_BUTTON.disabled = false;

    document
      .querySelectorAll(".timer button")
      .forEach((b) => (b.disabled = true));

    lockScreen();
  };

  stop = () => {
    clearInterval(this.interval);
    this.interval = undefined;

    this.queue.stop();
    this.updateCounter(0);
    this.render();
    this.radialProgress.stop();

    START_BUTTON.disabled = false;
    STOP_BUTTON.disabled = true;

    document
      .querySelectorAll(".timer button")
      .forEach((b) => (b.disabled = false));

    releaseScreen();
  };

  handleInterval = () => {
    if (this.hasFinished) {
      this.next();
    } else {
      this.updateCounter();

      if (this.hasFinished) {
        this.playBell();
      }
    }

    this.render();
  };

  next = () => {
    if (!this.queue.hasNext) {
      return this.stop();
    }

    this.queue.next();
    this.radialProgress.update(
      this.queue.current.time,
      COLORS[this.queue.currentIndex]
    );
    this.updateCounter(0);
  };

  updateCounter = (value) => {
    if (value === 0) {
      this.activeTimer = 0;
    } else {
      this.activeTimer++;
    }
  };

  playBell = () => new Audio(SOUND_URL).play();

  toggleLoop = () => this.queue.toggleLoop();

  render = () => {
    COUNTER.innerHTML = this.queue.current.getCounter(this.activeTimer);

    if (this.queue.current.moreThanOneMinute) {
      COUNTER.classList.add("over-one-minute");
    } else {
      COUNTER.classList.remove("over-one-minute");
    }
  };

  renderTimers = () => {
    TIMERS_CONTAINER.innerHTML = "";
    this.queue.timers.map((t, i) => TIMERS_CONTAINER.append(t.render(i)));
  };
}

/** Creates an Timer instance with time in seconds */
class Timer {
  constructor(time) {
    this.id = getId();
    this.time = time;
    this.moreThanOneMinute = this.time >= MINUTE;
  }

  toString() {
    const minutes = Math.floor(this.time / MINUTE)
      .toString()
      .padStart(2, "0");
    const seconds = (this.time % MINUTE).toString().padStart(2, "0");

    return `${minutes}:${seconds}`;
  }

  getCounter(counter = 0) {
    const time = this.time - counter;

    if (this.moreThanOneMinute) {
      const minutes = Math.floor(time / MINUTE)
        .toString()
        .padStart(2, "0");
      const seconds = (time % MINUTE).toString().padStart(2, "0");

      return `${minutes}:${seconds}`;
    }

    return time.toString();
  }

  render = (index) => {
    const template = document.createElement("timer-item");

    template.color = COLORS[index];
    template.id = this.id;
    template.index = index;
    template.time = this.toString();
    template.onRemove = controller.remove;

    return template;
  };
}

class RadialProgress {
  constructor() {
    this.progress = 0;

    this.circle = CIRCLE;

    this.circumference = this.circle.r.baseVal.value * 2 * Math.PI;
    this.circle.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
  }

  update = (time, color) => {
    this.circle.style.transitionDuration = "0s";
    this.circle.style.stroke = color;
    this.circle.style.strokeDashoffset = this.offset(0);

    setTimeout(() => {
      this.circle.style.transitionDuration = `${time}s`;
      this.circle.style.strokeDashoffset = this.offset(100);
    }, 100);
  };

  stop = () => {
    this.circle.style.transitionDuration = "0s";
    this.circle.style.strokeDashoffset = this.offset(0);
  };

  offset = (progress) =>
    this.circumference - (progress / 100) * this.circumference;
}

class TimerFormController {
  constructor() {
    this.value = "";

    this.unidentifiedKey = false;

    NEW_TIMER_INPUT.addEventListener("keydown", this.handleKeydown);
    NEW_TIMER_INPUT.addEventListener("keyup", this.handleKeyup);
    ADD_TIMER_FORM.addEventListener("submit", this.handleSubmit);
    MODAL_OVERLAY.addEventListener("click", this.handleClose);
    OPEN_FORM_BUTTON.addEventListener("click", this.open);
  }

  get formattedValue() {
    const value = this.value.padStart(4, "0");

    return `${value.charAt(0)}${value.charAt(1)}:${value.charAt(
      2
    )}${value.charAt(3)}`;
  }

  get isValid() {
    return this.value.length > 1;
  }

  open = () => {
    MODAL_OVERLAY.classList.add("visible");
    NEW_TIMER_INPUT.value = this.formattedValue;
    NEW_TIMER_INPUT.focus();
  };

  close = () => MODAL_OVERLAY.classList.remove("visible");

  handleKeydown = (e) => {
    const { key } = e;

    if (key === "ArrowRight" || key === "ArrowLeft") {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (key === "Unidentified") {
      this.unidentifiedKey = true;
      return;
    }

    this.unidentifiedKey = false;

    if (key === "Backspace") {
      this.value = this.value.substring(0, this.value.length - 1);
    } else if (key === "Enter") {
      if (this.isValid) {
        return this.handleSubmit();
      }
    }

    if (key === "0" && this.value.length === 0) {
      return;
    }

    if (this.value.length === 4) {
      return;
    }

    this.updateValue(this.value + key);
  };

  handleKeyup = (e) => {
    if (this.unidentifiedKey) {
      let value = NEW_TIMER_INPUT.value.replace(":", "");

      while (value.length > 0 && value.charAt(0) === "0") {
        value = value.slice(1);
      }

      this.updateValue(value);
    }
  };

  updateValue = (value) => {
    this.value = isNaN(value) ? this.value : value;

    NEW_TIMER_INPUT.value = this.formattedValue;
    ADD_TIMER_BUTTON.disabled = !this.isValid;
  };

  handleSubmit = (e) => {
    e && e.preventDefault();

    const value = this.value.padStart(4, "0");

    const minutes = Number(value.slice(0, 2));
    const seconds = Number(value.slice(2, 4));

    controller.add(minutes * 60 + seconds);

    this.value = "";
    ADD_TIMER_BUTTON.disabled = true;

    this.close();
  };

  handleClose = (e) => {
    if (e.target === e.currentTarget) {
      this.close();
    }
  };
}

const controller = new Controller();

const timerFormController = new TimerFormController();

controller.add(20);
controller.add(60);

// controller.add(90);

// controller.add(20);
// controller.add(10);
// controller.add(30);
// controller.add(15);

// controller.add(60);
// controller.add(10);
// controller.add(40);

START_BUTTON.addEventListener("click", controller.start);
STOP_BUTTON.addEventListener("click", controller.stop);
LOOP_CHECKBOX.addEventListener("click", controller.toggleLoop);

// document.addEventListener("visibilitychange", () => {
//   if (document.hidden) {
//     console.log("doc hidden");
//   } else {
//     console.log("doc visible");
//   }
// });
