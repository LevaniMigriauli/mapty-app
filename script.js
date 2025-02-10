'use strict'


class Workout {
  date = new Date()
  id = (Date.now() + '').slice(-10)
  clicks = 0

  constructor(coords, distance, duration) {
    this.coords = coords // [lat, lng]
    this.distance = distance // in km
    this.duration = duration // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December']

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
  }

  click() {
    this.clicks++
  }
}

class Running extends Workout {
  type = 'running'

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration)
    this.cadence = cadence
    this.calcPace()
    this._setDescription()
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance
    return this.pace
  }
}

class Cycling extends Workout {
  type = 'cycling'

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration)
    this.elevationGain = elevationGain
    this.calcSpeed()
    this._setDescription()
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60)
    return this.speed
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178)
// const cycling1 = new Cycling([39, -12], 27, 95, 523)
// console.log(run1, cycling1)

////////////////////////////////////
// APPLICATION ARCHITECTURE

const form = document.querySelector('.form')
const containerWorkouts = document.querySelector('.workouts')
const inputType = document.querySelector('.form__input--type')
const inputDistance = document.querySelector('.form__input--distance')
const inputDuration = document.querySelector('.form__input--duration')
const inputCadence = document.querySelector('.form__input--cadence')
const inputElevation = document.querySelector('.form__input--elevation')

class App {
  #map
  #mapZoomLevel = 13
  #mapEvent
  #workouts = []

  constructor() {
    // Get user's position
    this._getPosition()

    // getData from local storage
    this._getLocalStorage()

    form.addEventListener('submit', this._newWorkout.bind(this))
    inputType.addEventListener('change', this._toggleElevationField)
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
    // Edit added workout
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this))
  }


  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),
          function () {
            alert('Could not get your position')
          })
    }
  }

  _loadMap(position) {
    const {latitude} = position.coords
    const {longitude} = position.coords

    const coords = [latitude, longitude]

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel)

    L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map)

    // Handling clicks on map
    this.#map.on('click', this._showForm.bind(this))

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work)
    })
  }

  _showForm(mapE) {
    this.#mapEvent = mapE
    form.classList.remove('hidden')
    inputDistance.focus()
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value = inputDuration.value = inputDistance.value = inputElevation.value = ''
    form.style.display = 'none'
    form.classList.add('hidden')
    setTimeout(() => form.style.display = 'grid', 1000)
  }

  _toggleElevationField() {
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden')
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden')
  }

  _newWorkout(e) {
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp))
    const allPositive = (...inputs) => inputs.every(inp => inp > 0)
    e.preventDefault()

    // Get data from form
    const type = inputType.value
    const distance = +inputDistance.value
    const duration = +inputDuration.value
    const {lat, lng} = this.#mapEvent.latlng
    let workout
    // check if data is valid

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value
      // check if data is valid
      if (!validInputs(distance, duration, cadence) ||
          !allPositive(distance, duration, cadence))
        return alert('Inputs have to be positive numbers!')

      workout = new Running([lat, lng], distance, duration, cadence)
    }


    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value
      // check if data is valid
      if (!validInputs(distance, duration, elevation) ||
          !allPositive(distance, duration))
        return alert('Inputs have to be positive numbers!')

      workout = new Cycling([lat, lng], distance, duration, elevation)
    }

    // Add new object to workout array
    this.#workouts.push(workout)

    // Render workout on map as marker
    this._renderWorkoutMarker(workout)

    // Render workout on list
    this._renderWorkout(workout)

    // Hide form + Clear input fields
    this._hideForm()

    // Set local storage to all workouts
    this._setLocalStorage()
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords).addTo(this.#map).bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`
        })).setPopupContent(`${workout.type === 'running' ? '🏃' : '🚴‍'} ${workout.description}`).openPopup()
  }

  _renderWorkout(workout) {
    let html = `
          <li class="workout workout--${workout.type}" data-id='${workout.id}'>
          <h2 class="workout__title">${workout.description}
          <button class="btn__edit">Edit</button>
          </h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃' : '🚴‍'}️</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `

    if (workout.type === 'running') {
      html += `
       <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>
      `
    }

    if (workout.type === 'cycling') {
      html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>
      `
    }

    form.insertAdjacentHTML("afterend", html)
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout')
    const isBtnEl = e.target.classList.contains('btn')
    if (isBtnEl || !workoutEl) return

    const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id)

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1
      }
    })

    // using the public interface
    // workout.click()
  }

  _setLocalStorage() {
    setTimeout(() => localStorage.setItem('workouts', JSON.stringify(this.#workouts)), 0)
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'))

    if (!data) return

    this.#workouts = data.map(work => {
      if (work.type === 'running') {
        return Object.assign(new Running(), work)
      }
      if (work.type === 'cycling') {
        return Object.assign(new Cycling(), work)
      }
    })

    this.#workouts.forEach(work => this._renderWorkout(work))
  }

  _editWorkout(e) {
    if (!e.target.classList.contains('btn__edit')) return
    const work = e.target.closest('.workout')
    const workoutId = work.dataset.id
    const workoutEl = this.#workouts.find(work => work.id === workoutId)
    const indexOfWorkout = this.#workouts.indexOf(workoutEl)
    const workoutType = workoutEl.type
    //   need edit logic here
    // prevent adding multiple forms
    const hasEditForm = work.previousElementSibling.classList.contains('form-edit')
    if (hasEditForm) return;
    const formId = workoutId + indexOfWorkout

    let html = `
        <span>Edit  </span><span> workout </span>
        <div class="form__row">
          <label class="form__label">Type</label>
          <select class="form__input form__input--type" value="${workoutEl.type}">
            <option value="running">Running</option>
            <option value="cycling">Cycling</option>
          </select>
        </div>
        <div class="form__row">
          <label class="form__label">Distance</label>
          <input class="form__input form__input--distance" placeholder="km" Value='${workoutEl.distance}'/>
        </div>
        <div class="form__row">
          <label class="form__label">Duration</label>
          <input
              class="form__input form__input--duration"
              placeholder="min"
              Value="${workoutEl.duration}"
          />
        </div>
        <button class="form__btn">OK</button>
     `

    if (workoutType === 'running') {
      html += `
      <div class="form__row">
        <label class="form__label">Cadence</label>
        <input
            class="form__input form__input--cadence"
            placeholder="step/min"
            Value="${workoutEl.cadence}"
        />
      </div>
        `
    }

    if (workoutType === 'cycling') {
      html += `
      <div class="form__row">
        <label class="form__label">Elev Gain</label>
        <input
            class="form__input form__input--elevation"
            placeholder="meters"
            Value="${workoutEl.elevationGain}"
        />
      </div>
        `
    }

    work.insertAdjacentHTML('beforebegin', `<form class="form form-edit" data-edit-for="${workoutId}" id="${formId}">${html}</form>`)

    containerWorkouts.addEventListener('submit', function (e) {
      e.preventDefault()
      // console.log(e.target)
      if (e.target.classList.contains('form-edit') && e.target.id === formId) {
        const formEditData = e.target.querySelectorAll('.form__row')

        const updatedParams = {}

        formEditData.forEach(el => {
          const labelText = el.children[0].textContent
          const inputValue = +el.children[1].value

          if (labelText === 'Duration') {
            updatedParams.duration = inputValue
            return;
          }
          if (labelText === 'Distance') {
            updatedParams.distance = inputValue
            return;
          }
          if (workoutType === 'running') {
            if (labelText === 'Cadence') {
              updatedParams.cadence = inputValue
              return;
            }
          }
          if (workoutType === 'cycling') {
            if (labelText === 'Elev Gain') {
              updatedParams.elevationGain = inputValue
              return;
            }
          }
        })
        this._editWorkoutProps(workoutId, updatedParams)
        e.target.remove()
      }
    }.bind(this))
  }

  _editWorkoutProps(workoutId, params) {
    let workoutInstance
    // Refactorable using Object.assign
    const currentWorkoutToEdit = this.#workouts.find(el => el.id === workoutId)
    // Refactorable using for in loop
    currentWorkoutToEdit.distance = params.distance
    currentWorkoutToEdit.duration = params.duration
    if (currentWorkoutToEdit instanceof Running) currentWorkoutToEdit.cadence = params.cadence
    if (currentWorkoutToEdit instanceof Cycling) currentWorkoutToEdit.elevationGain = params.elevationGain

    const currentWorkoutElementNode = containerWorkouts.querySelector(`.workout[data-id='${workoutId}']`)

    const nodes = currentWorkoutElementNode.querySelectorAll('div .workout__value')

    this._setLocalStorage()
    if (currentWorkoutToEdit instanceof Running) {
      nodes.forEach((el, i) => {
        if (i === 0) el.textContent = currentWorkoutToEdit.distance
        if (i === 1) el.textContent = currentWorkoutToEdit.duration
        if (i === 2) el.textContent = currentWorkoutToEdit.calcPace().toFixed(1)
        if (i === 3) el.textContent = currentWorkoutToEdit.cadence
      })
      return
    }
    if (currentWorkoutToEdit instanceof Cycling) {
      nodes.forEach((el, i) => {
        if (i === 0) el.textContent = currentWorkoutToEdit.distance
        if (i === 1) el.textContent = currentWorkoutToEdit.duration
        if (i === 2) el.textContent = currentWorkoutToEdit.calcSpeed().toFixed(1)
        if (i === 3) el.textContent = currentWorkoutToEdit.elevationGain
      })
      return
    }
  }

  reset() {
    localStorage.removeItem('workouts')
    location.reload()
  }
}

const app = new App()