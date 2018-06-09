import { MDCSelect } from '@material/select'
import { MDCRipple } from '@material/ripple'

import Component from '../component'
import template from './panel.html'
import './panel.scss'

export default class Panel extends Component {
  constructor (...args) {
    super(...args)
    this.$el.html(template())

    this.select = new MDCSelect(this.$el.find('.mdc-select')[0])
    this.switch = this.$el.find('.mdc-switch > input')
    this.buttons = this.$el.find('.mdc-button')
    _.each(this.buttons, button => MDCRipple.attachTo(button))

    this.buttons.on('click', (e) => {
      const data = e.currentTarget.parentElement.dataset
      if (data) {
        if (data.action === 'undo' || data.action === 'redo') {
          return this.actionman[data.action]()
        }
        const ids = data.ids ? data.ids.split(' ') : 'all'
        this.actionman.fire(data.action, ids)
      }
    })

    this.select.listen('change', () => {
      this.actionman.fire('SetColor', 'all', this.select.value)
    })
    this.switch.on('change', (e) => {
      // this action may be fired with or without flag
      this.actionman.fire('ToggleRaise', 'all', e.target.checked)
    })
    $('.menu-item .toggle-enabled').on('change', (e) => {
      this.actionman.get(e.target.parentElement.dataset.action).evaluate(e.target.checked)
    })

    this.actionman.on('change:history', () => {
      this.$el.find('.undo').attr('disabled', !this.actionman.canUndo())
      this.$el.find('.redo').attr('disabled', !this.actionman.canRedo())
    })

    const updateSwitch = (registrar, state) => {
      this.switch.prop('checked', state)
    }
    const toggleRaise = this.actionman.get('ToggleRaise')
    toggleRaise.on('fire', updateSwitch)
    toggleRaise.on('undo', updateSwitch)
  }
}
