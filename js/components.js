class TimerItem extends HTMLElement {
  handleRemove = () => this.onRemove(this.id);

  connectedCallback() {
    this.innerHTML = `
      <div class="timer">
        <span style="background-color:${this.color}">
          ${this.index + 1}
        </span>
        <span class="interval">${this.time}</span>
        <button class="button icon-button">
          x
        </button>
      </div>
    `;

    this.button = this.querySelector("button");
    this.button.addEventListener("click", this.handleRemove);
  }

  disconnectedCallback() {
    this.button.removeEventListener("click", this.handleRemove);
  }

  static get observedAttributes() {
    return ["color", "id", "index", "time"];
  }
}

customElements.define("timer-item", TimerItem);
