/**
 * Action Manager
 */
import EventEmitter from 'eventemitter3'
import Action from './action'
import ToggleAction from './toggle-action'

export default class Actionman extends EventEmitter {
  constructor (p = {}) {
    super()
    // TODO should store action instances, not objects
    this._instances = {}
    // TODO why not used
    this._registrars = {}
    // array of action fire events { instance, arguments }
    this._history = []
    this._cursor = 0
  }

  get history () {
    return this._history
  }

  get (id) {
    return this._instances[id].action
  }

  getAll () {
    return this._instances
  }
  /**
   * @return {Array} of enabled actions
   */
  getActive () {
    const instances = _.filter(this._instances, instance => instance.action.isEnabled)
    return _.map(instances, (instance) => {
      if (instance.action.isEnabled) {
        return instance.action
      }
    })
  }
  /**
   * An action can be created by name
   * It will be used as its id, and method of the same name will be called on each registrar
   * Each action is unique by id
   * Subscribe registrar for this action
   * @param {Action | String} CustomAction
   * @param {Object} registrar
   * @param {String} registrarId
   */
  set (CustomAction, registrar, registrarId) {
    const actionId = _.isString(CustomAction) ? CustomAction : CustomAction.name
    let Klass
    if (_.isString(CustomAction)) {
      Klass = CustomAction.startsWith('Toggle') ? ToggleAction : Action
    } else Klass = CustomAction

    if (this._instances[actionId]) {
      this._instances[actionId].registrars[registrarId] = registrar
    } else {
      const action = new Klass(actionId)
      this._instances[actionId] = { action, registrars: { [registrarId]: registrar } }
    }

    this.emit('add', this._instances[actionId].action)
  }
  /**
   * Unsubscribe registrar from action
   * Clear all listeners if there are no registrars left
   * @param {Action | String} CustomAction class or id
   * @param {String | Object} idOrRegistrar
   */
  unset (CustomAction, idOrRegistrar) {
    const actionId = _.isString(CustomAction) ? CustomAction : CustomAction.name
    if (this._instances[actionId]) {
      let id
      let registrar
      if (_.isString(idOrRegistrar)) id = idOrRegistrar
      else registrar = idOrRegistrar

      if (id) delete this._instances[actionId].registrars[id]
      if (registrar && this._instances[actionId].registrars[registrar.id]) {
        delete this._instances[actionId].registrars[registrar.id]
      }
      if (_.isEmpty(this._instances)) this.off()
    }
  }
  /**
   * Updates all actions state
   */
  update (...args) {
    _.values(this._instances).forEach((instance) => {
      instance.action.evaluate(...args)
    })
  }
  /**
   * Fire an action by id (name of the action)
   * The action will be fired as many times as there are registrars
   * @param { String } id The id of the action
   * @param { Array } registarIds list of registrar ids for which action should be fired
   */
  // TODO always use dedicated argument for non-optional (registrarIds here)
  fire (id, ...args) {
    const action = this._instances[id].action
    if (!_.isNil(action) && action.isEnabled) {
      if (action.canUndo) {
        if (this._history.length > this._cursor) { // Changes in the past change the future
          this.updateHistory(this._history.slice(0, this._cursor))
        }
        this.addToHistory({ action, args })
      }
      // TODO rename to registrarIds
      let [registrarsId, ...params] = args // eslint-disable-line
      if (registrarsId === 'all') registrarsId = _.keys(this._instances[id].registrars)
      registrarsId = _.castArray(registrarsId)
      _.each(registrarsId, (registrarId) => {
        const registrar = this._instances[id].registrars[registrarId]
        action.apply(registrar, ...params)
      })
    }
  }
  // TODO why public?
  addToHistory (value) {
    this._cursor++
    this._history.push(value)
    this.emit('change:history')
  }
  // TODO why public?
  updateHistory (history) {
    this._history = history
    this.emit('change:history')
  }

  _apply (method) {
    const id = this._history[this._cursor].action.id
    const action = this._history[this._cursor].action
    let [registrarsId] = this._history[this._cursor].args
    if (registrarsId === 'all') registrarsId = _.keys(this._instances[id].registrars)
    registrarsId = _.castArray(registrarsId)
    const [, ...args] = this._history[this._cursor].args
    _.each(registrarsId, (registrarId) => {
      const registrar = this._instances[id].registrars[registrarId]
      action[method].call(action, registrar, ...args)
    })
  }
  // TODO what if undo is not possible but called?
  undo () {
    this._cursor--
    this._apply('undo')
    this.emit('change:history')
  }
  // TODO what if redo is not possible but called?
  redo () {
    this._apply('_execute')
    this._cursor++
    this.emit('change:history')
  }

  canUndo () {
    return this._history.length > 0 && this._cursor > 0
  }

  canRedo () {
    return this._cursor < this._history.length
  }
}
