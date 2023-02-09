const SECOND = 1000;
const MINUTE = 60;

const SOUND_URL = "./assets/audio/metal-bowl-5.2-inch.mp3";

const CIRCLE = document.getElementById("radial-progress");
const COUNTER = document.getElementById("counter");
const LOOP_CHECKBOX = document.getElementById("loop-checkbox");
const START_BUTTON = document.getElementById("start-button");
const STOP_BUTTON = document.getElementById("stop-button");
const TIMERS_CONTAINER = document.getElementById("timers-container");

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

// https://coolors.co/palette/f72585-b5179e-7209b7-560bad-480ca8-3a0ca3-3f37c9-4361ee-4895ef-4cc9f0
// const COLORS = [
//   "#F72585",
//   "#B5179E",
//   "#7209B7",
//   "#560BAD",
//   "#480CA8",
//   "#3A0CA3",
//   "#3F37C9",
//   "#4361EE",
//   "#4895EF",
//   "#4CC9F0",
// ];

// https://coolors.co/palette/f94144-f3722c-f8961e-f9844a-f9c74f-90be6d-43aa8b-4d908e-577590-277da1
const COLORS = [
  "#f94144",
  "#f3722c",
  "#f9844a",
  "#f8961e",
  "#f9c74f",
  "#90be6d",
  "#43aa8b",
  "#4d908e",
  "#577590",
  "#277da1",
];

// let wakeLock = null;

// const lockScreen = async () => {
//   // create an async function to request a wake lock
//   try {
//     wakeLock = await navigator.wakeLock.request("screen");
//     console.log("Wake lock is active!");
//   } catch (err) {
//     console.log("Wake lock request failed.", err.name, err.message);
//   }
// };

// const releaseScreen = () =>
//   wakeLock.release().then(() => {
//     wakeLock = null;
//   });

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
    this.counter = 0;
    this.interval = undefined;
    this.queue = new Queue(LOOP_CHECKBOX.checked);

    this.radialProgress = new RadialProgress();

    STOP_BUTTON.disabled = true;
  }

  get hasFinished() {
    return this.counter === this.queue.current.time;
  }

  add = (time) => {
    this.queue.add(time);
    this.renderTimers();
  };

  remove = (timerId) => {
    this.queue.remove(timerId);
    this.renderTimers();
  };

  start = () => {
    this.next();
    this.render();
    this.interval = setInterval(this.handleInterval, SECOND);
    START_BUTTON.disabled = true;
    STOP_BUTTON.disabled = false;
    // lockScreen();
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
    // releaseScreen();
  };

  handleInterval = () => {
    if (this.hasFinished) {
      this.next();
    } else {
      this.updateCounter();

      if (this.hasFinished) {
        this.playSound();
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
      this.counter = 0;
    } else {
      this.counter++;
    }
  };

  playSound = () => new Audio(SOUND_URL).play();

  toggleLoop = () => this.queue.toggleLoop();

  render = () => {
    COUNTER.innerHTML = this.queue.current.getCounter(this.counter);

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

class Timer {
  /** Creates an Timer instance with time in seconds */
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
    const template = document.createElement("div");

    template.classList.add("timer");
    template.setAttribute("data-id", this.id);
    template.innerHTML = `<span style="background-color:${COLORS[index]}">${
      index + 1
    }</span><span>${this.toString()}</span>`;

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

const controller = new Controller();

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
