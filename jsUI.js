// NOTE: SwiftUI inspired collection of types for declarative HTML rendering in JavaScript.


// MARK: Base 
/** A wrapper around the object literal lookup.
 * @param {any} key
 * @param {Object} cases Cases that can fail should be lazily evaluated! E.g. { "case1": 1, "case2": "b", "caseCanFail": () => val }.
 * @param {any} defaultCase Must be provided.
 * @return {any} case selected.
*/
function switchCase(key, cases, defaultCase) {
  if (defaultCase === undefined)
    throw new Error("Default case for switchView not provided!")

  let case_selected = (cases[key] || defaultCase)

  // Check if a variable is a function
  // Reference: https://stackoverflow.com/a/19717946/5856760
  return case_selected instanceof Function ? case_selected() : case_selected
}


// MARK: Interfaces
// Interface reference: https://medium.com/@yuribett/javascript-abstract-method-with-es6-5dbea4b00027
class _ViewType {
  /** @return {string} HTML of drawn view. */
  get render() { throw new Error(`Implementation of render() missing at ${this.constructor.name} !`) }
}

/** Interface for View types.
 * Support HTML Global Attributes.
 */
class ViewType extends _ViewType {
  // Attributes
  _class = null
  _id = null
  _style = null

  class(classID) { this._class = classID; return this }
  id(newID) { this._id = newID; return this }
  style(style_definitions) { this._style = style_definitions; return this }

  inherit_globalAtrs(view) {
    this._class = view._class
    this._id = view._id
    this._style = view._style
    return this
  }
}

/** Interface for built-in HTML tag views. */
class BuiltinViewType extends ViewType {
  /** @return {string} Builds view using HTML tags. */
  get raw() { throw new Error(`Implementation of raw() missing at ${this.constructor.name}!`) }

  get render() { return this.raw }
}

/** Draws HTML code from a ViewType.
 * @param {ViewType} view
 * @return {string} HTML as a string.
*/
function html(view) {
  return drawRaw(view)
}

// Interal functions
/** Wraps around the raw type to provide the viewType functionality for non-view data
 * @param {(ViewType|any)} content
 * @return {string}
 */
function drawRaw(content) {
  return content instanceof ViewType ? content.render :
    content instanceof Array ? content.map(drawRaw).join('') :
      content
}

/** Renders an optional attribute
 * @param {?string} attribute
 * @param {"value"|"boolean"} type
 * @return {string}
*/
function render_optAtr(label, attribute = null, type = "value") {
  return attribute != null ?
    switchCase(type, {
      'value': `${label}="${attribute}"`,
      'boolean': label
    }, '') :
    ''
}
function render_globalAtrs(view) {
  return [
    render_optAtr("class", view._class),
    render_optAtr("id", view._id),
    render_optAtr("style", view._style)
  ].filter(x => x != '').join(' ')
}
/** Renders optional attributes as well as global attributes.
 * @param {[["label","attribute","?type"]]} optionalAttributes
 */
function render_commonAtr(view, optionalAttributes = [], includeGlobalAttributes = true) {
  return [
    optionalAttributes.map(atr => render_optAtr(atr[0], atr[1], atr[2])).filter(x => x != '').join(' '),
    (includeGlobalAttributes ? render_globalAtrs(view) : '')
  ].filter(x => x != '').join(' ')
}


// MARK: forEachView
class _forEachView extends ViewType {
  /** @type {[any]} Array of any elements to draw */
  elements
  /** Function to create an element view. Needs drawing */
  f_elToView

  constructor(elements, f_elToView) {
    super()
    this.elements = elements
    this.f_elToView = f_elToView
  }

  get render() {
    return this.elements.map(this.f_elToView).map(drawRaw).join('')
  }
}
let forEachView = (data, f_view) => new _forEachView(data, f_view)


// MARK: <div> view
class _divView extends BuiltinViewType {
  elements

  constructor(elements) {
    super()
    this.elements = elements
  }

  get raw() {
    return `
        <div ${render_commonAtr(this)}>
          ${this.elements.map(drawRaw).join('')}
        </div>
      `
  }
}
let div = (...elements) => new _divView(elements)


// MARK: <main>, <nav>, <header> view
class _mainView extends BuiltinViewType {
  /** @type {ViewType|any} */
  content

  constructor(content) {
    super()
    this.content = content
  }

  get raw() {
    return `
      <main ${render_commonAtr(this)}>
        ${this.content.map(drawRaw).join('')}
      </main>
    `
  }
}
let main = (...content) => new _mainView(content)

class _navView extends BuiltinViewType {
  elementViews
  // optional attributes
  _for
  constructor(elementViews) {
    super()
    this.elementViews = elementViews
  }
  for(id) { this._for = id; return this }
  get render() {
    return `
      <nav ${render_commonAtr(this, [["for", this._for]])}>
        ${this.elementViews.map(drawRaw).join('')}
      </nav>
    `
  }
}
let nav = (...elementViews) => new _navView(elementViews)

class _headerView extends BuiltinViewType {
  elementViews

  constructor(elementViews) {
    super()
    this.elementViews = elementViews
  }

  get render() {
    return `
      <header ${render_commonAtr(this)}>
        ${this.elementViews.map(drawRaw).join('')}
      </header>
    `
  }
}
let header = (...elementViews) => new _headerView(elementViews)


// MARK: <p>, <b>, <h1-6> view
/** Renders text-based views */
class _TextView extends BuiltinViewType {
  tagName
  text

  constructor(tagName, ...text) {
    super()
    this.tagName = tagName
    this.text = text
  }

  get raw() {
    return `<${this.tagName} ${render_commonAtr(this)}> ${this.text.map(drawRaw).join('')} </${this.tagName}>`
  }
}
let p = (...text) => new _TextView('p', text),
  b = (...text) => new _TextView('b', text),
  i = (...text) => new _TextView('i', text),
  h1 = (...text) => new _TextView('h1', text),
  h2 = (...text) => new _TextView('h2', text),
  h3 = (...text) => new _TextView('h3', text),
  h4 = (...text) => new _TextView('h4', text),
  h5 = (...text) => new _TextView('h5', text),
  h6 = (...text) => new _TextView('h6', text)


// MARK: <a> view
class _aView extends BuiltinViewType {
  text
  // Attributes
  _href

  constructor(text) {
    super()
    this.text = text
  }

  href(url) { this._href = url; return this }

  get raw() {
    return `
      <a href="${this._href}" ${render_commonAtr(this)}>
        ${drawRaw(this.text)}
      </a>`
  }
}
let a = (...text) => new _aView(text)


// MARK: <img> view
/** HTML img tag.
 * Reference: https://www.w3schools.com/html/html_images.asp */
class _imgView extends BuiltinViewType {
  _src
  _alt
  /** @type {"eager"|"lazy"} */
  _loading = null

  src(url) { this._src = url; return this }
  alt(text) { this._alt = text; return this }

  loading(type) { this._loading = type; return this }

  get raw() {
    return `<img src="${this._src}" alt="${this._alt}" ${render_commonAtr(this, [["loading", this._loading]])}>`
  }
}
let img = () => new _imgView()

// MARK: <video> view
class _sourceView extends BuiltinViewType {
  /** @type {string} URL */
  _src
  /** @type {string} */
  _type

  constructor(src, type) {
    super()
    this._src = src
    this._type = type
  }

  get raw() {
    return `<source src="${this._src}" type="${this._type}" ${render_commonAtr(this)}>`
  }
}
let source = (src, type) => new _sourceView(src, type)

/** Reference: https://www.w3schools.com/tags/tag_video.asp */
class _videoView extends BuiltinViewType {
  /** @type {[(_sourceView|string)]} Could be \<source> tag or text */
  sources
  // Optional attributes
  /** @type {boolean} */
  _controls = null
  /** @type {string} URL */
  _poster = null
  /** @type {("auto"|"metadata"|"none")} */
  _preload = null

  constructor(sources) {
    super()
    this.sources = sources
  }

  get controls() { this._controls = true; return this }
  poster(url) { this._poster = url; return this }
  preload(val) { this._preload = val; return this }

  get raw() {
    return `
        <video ${render_commonAtr(this, [
      ["controls", this._controls, "boolean"],
      ["poster", this._poster],
      ["preload", this._preload]
    ])}>
          ${// Sources
      forEachView(this.sources, drawRaw).render
      }
        </video>
      `
  }
}
let video = (...sources) => new _videoView(sources)


// MARK: <button> view
/** Reference: https://www.w3schools.com/tags/tag_button.asp */
class _buttonView extends BuiltinViewType {
  body
  /** @type{"button"|"reset"|"submit"} */
  _type
  _onclick

  constructor(body) {
    super()
    this.body = body
  }

  type(val) { this._type = val; return this }
  onclick(action) { this._onclick = action; return this }

  get raw() {
    return `
      <button ${render_commonAtr(this, [
      ["type", this._type],
      ["onclick", this._onclick]
    ])}>
        ${this.body.map(drawRaw).join('')}
      </button>
    `
  }
}
let button = (...body) => new _buttonView(body)


// MARK: <table> view
/** Table header */
class _thView extends BuiltinViewType {
  /** @type {ViewType|any} */
  colName

  constructor(colName) {
    super()
    this.colName = colName
  }

  get raw() {
    return `<th ${render_commonAtr(this)}> ${drawRaw(this.colName)} </th>`
  }
}
let th = colName => new _thView(colName)

/** Table cell */
class _tdView extends BuiltinViewType {
  /** @type {ViewType|any} */
  data

  constructor(data) {
    super()
    this.data = data
  }

  get raw() {
    return `<td ${render_commonAtr(this)}> ${drawRaw(this.data)} </td>`
  }
}
let td = data => new _tdView(data)

/** Table row */
class _trView extends BuiltinViewType {
  /** @type {[ViewType]|[any]} */
  cols

  constructor(cols) {
    super()
    this.cols = cols
  }

  get raw() {
    return `
        <tr ${render_commonAtr(this)}>
          ${// Columns
      forEachView(this.cols, drawRaw).render} 
        </tr>
       `
  }
}
let tr = (...cols) => new _trView(cols)

/** HTML table view. */
class _tableView extends BuiltinViewType {
  /** @type {[_trView]} Function that creates an array of table rows. */
  content

  constructor(...content) {
    super()
    this.content = content
  }

  get raw() {
    return `
        <table ${render_commonAtr(this)}>
            ${forEachView(this.content, drawRaw).render}
        </table>
    `
  }
}
let table = (...content) => new _tableView(content)