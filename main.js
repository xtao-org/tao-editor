const indent = 0
const opMode = false
const domData = new WeakMap()
const cursor = Cursor()
const root = Tree({classes: ['root', 'empty'], cursor})
// appendCursor(domData.get(root).tao, cursor)

const globals = {
  domData,
  root,
  cursor,
  // todo:
  cursors: [cursor],
  lines: [],
  line: 0,
  // todo: adjust when navigating/inserting/deleting...
  column: 0,
  selected: [],
  opMode,
  indent,
}

function isChar(ch) {
  return ch.classList.contains('char')
}

function Note(ch) {
  console.assert(isChar(ch), ch)
  const note = document.createElement('span')
  note.classList.add('note')
  note.appendChild(ch)
  return note
}
function Op({cursor = null} = {}) {
  const op = document.createElement('span')
  op.classList.add('op')
  op.appendChild(Char('`'))
  if (cursor !== null) op.appendChild(cursor)

  globals.opMode = true
  
  return op
}

function Char(ch) {
  const char = document.createElement('span')
  char.classList.add('char')
  char.appendChild(document.createTextNode(ch))
  return char
}
function Tree({classes = [], cursor = null} = {}) {
  const tree = document.createElement('span')
  tree.classList.add('tree', ...classes)
  const leftBracket = Char('[')
  leftBracket.classList.add('left', 'bracket')
  tree.appendChild(leftBracket)
  const tao = Tao({cursor})
  tree.appendChild(tao)
  const rightBracket = Char(']')
  rightBracket.classList.add('right', 'bracket')
  tree.appendChild(rightBracket)
  domData.set(tree, {tao: tao})
  return tree
}
function Tao({cursor}) {
  const tao = document.createElement('span')
  tao.classList.add('tao')
  if (cursor !== null) tao.appendChild(cursor)

  return tao
}
function Cursor() {
  const cursor = document.createElement('span')
  cursor.classList.add('cursor')

  return cursor
}

function appendCursor(node, cursor) {
  node.appendChild(cursor)
}

window.addEventListener('load', () => {
  const {body} = document
  body.appendChild(globals.root)
})

function isNote(parentElement) {
  return parentElement.classList.contains('note')
}
function isTao(parentElement) {
  return parentElement.classList.contains('tao')
}
function isTree(parentElement) {
  return parentElement.classList.contains('tree')
}
function isOp(parentElement) {
  return parentElement.classList.contains('op')
}
function isRoot(parentElement) {
  return parentElement.classList.contains('root')
}

function isEmpty(node) {
  return node.classList.contains('empty')
}

function makeNonEmpty(node) {
  node.classList.remove('empty')
}

function makeTreeEmpty(tree) {
  console.assert(isTree(tree), tree)
  if (!tree.classList.replace('flat', 'empty')) {
    tree.classList.replace('nested', 'empty')
  }
}

function emptyToFlat(node) {
  node.classList.replace('empty', 'flat')
}

function insertRegular(ch) {
  console.assert(isChar(ch), ch)
  const {cursor} = globals
  const {parentElement} = cursor
  if (isNote(parentElement)) {
    cursor.before(ch)
  } else {
    console.assert(isTao(parentElement), parentElement)
    // todo: figure out changing tree's classes
    if (isEmpty(parentElement.parentElement)) emptyToFlat(parentElement.parentElement)
    const note = Note(ch)
    cursor.before(note)
    note.appendChild(cursor)
  }
}

// todo: take cursor as arg
// indent ~> depth, property (or domData) of cursor
function insertTree() {
  const {cursor} = globals
  const {parentElement} = cursor
  globals.indent += 1
  if (isNote(parentElement)) {
    if (parentElement.firstChild === cursor) {
      parentElement.before(cursor)
    } else if (parentElement.lastChild === cursor) {
      parentElement.after(cursor)
    } else {
      // node splitting
      const right = parentElement
      const left = Note(right.firstChild)

      while (right.firstChild !== cursor) {
        left.appendChild(right.firstChild)
      }
      right.before(left)
      left.after(cursor)
    }
    // // todo: note splitting
    // console.warn('no note splitting yet')
    // parentElement.after(cursor)
  }
  const tree = Tree({classes: ['empty']})
  // assuming cursor in tao
  if (!isNested(cursor.parentElement.parentElement)) makeTreeNested(cursor.parentElement.parentElement)
  cursor.before(tree)
  appendCursorToTree({cursor, tree})
}

function makeTreeNested(tree) {
  console.assert(isTree(tree), tree)
  if (!tree.classList.replace('empty', 'nested')) {
    tree.classList.replace('flat', 'nested')
  }
}

function appendCursorToTree({cursor, tree}) {
  console.assert(isTao(tree.children[1]), tree.children[1])
  tree.children[1].appendChild(cursor)
}

function prependCursorToTree({cursor, tree}) {
  console.assert(isTao(tree.children[1]), tree.children[1])
  tree.children[1].prepend(cursor)
}

// todo: insert at cursor instead of append
function appendOp(tao) {
  console.assert(isTao(tao), tao)
  const {cursor} = globals

  if (isEmpty(tao.parentElement)) emptyToFlat(tao.parentElement)

  const op = Op({cursor})
  tao.appendChild(op)
}

function exitTree(tao) {
  console.assert(isTao(tao), tao)
  const {cursor} = globals
  globals.indent -= 1
  const tree = tao.parentElement
  if (isRoot(tree)) console.warn('already at root')
  else tree.parentElement.appendChild(cursor)
}

function leftExitNote({note, cursor}) {
  console.assert(isNote(note), note)
  const tao = note.parentElement
  const {previousSibling} = note

  if (previousSibling === null) {
    const tree = tao.parentElement
    return leftExitTree({tree, cursor})
  }
  if (isOp(previousSibling)) {
    return leftSkipOp({op: previousSibling, cursor})
  }
  if (isTree(previousSibling)) {
    return leftEnterTree({tree: previousSibling, cursor})
  }

  console.assert(false, previousSibling)
}

function leftSkipOp({op, cursor}) {
  console.assert(isOp(op), op)
  op.before(cursor)
  tryLeftEnterNote({cursor})
}

function rightSkipOp({op, cursor}) {
  console.assert(isOp(op), op)
  op.after(cursor)
  tryRightEnterNote({cursor})
}

function rightExitNote({note, cursor}) {
  console.assert(isNote(note), note)
  const tao = note.parentElement
  const {nextSibling} = note

  if (nextSibling === null) {
    const tree = tao.parentElement
    return rightExitTree({tree, cursor})
  }
  if (isOp(nextSibling)) {
    return rightSkipOp({op: nextSibling, cursor})
  }
  if (isTree(nextSibling)) {
    return rightEnterTree({tree: nextSibling, cursor})
  }

  console.assert(false, nextSibling)
}

function leftEnterTree({tree, cursor}) {
  console.assert(isTree(tree), tree)
  appendCursorToTree({tree, cursor})
  tryLeftEnterNote({cursor})
}

function rightEnterTree({tree, cursor}) {
  console.assert(isTree(tree), tree)
  prependCursorToTree({tree, cursor})
  tryRightEnterNote({cursor})
}

function isLeftOfNote(node) {
  const {previousSibling} = node
  return previousSibling !== null && isNote(previousSibling)
}

function isRightOfNote(node) {
  const {nextSibling} = node
  return nextSibling !== null && isNote(nextSibling)
}

function tryLeftEnterNote({cursor}) {
  if (isLeftOfNote(cursor)) cursor.previousSibling.appendChild(cursor)
}

function tryRightEnterNote({cursor}) {
  if (isRightOfNote(cursor)) cursor.nextSibling.prepend(cursor)
}

function leftExitTree({tree, cursor}) {
  console.assert(isTree(tree), tree)
  if (isRoot(tree)) {
    console.warn('already at root')
    return
  }
  // cursor goes to the containing tao
  tree.before(cursor)

  // if exited next to note, enter it
  tryLeftEnterNote({cursor})
}

function rightExitTree({tree, cursor}) {
  console.assert(isTree(tree), tree)
  if (isRoot(tree)) {
    console.warn('already at root')
    return
  }
  // cursor goes to the containing tao
  tree.after(cursor)

  // if exited next to note, enter it
  tryRightEnterNote({cursor})
}

function select(node) {
  node.classList.add('selected')
  globals.selected.push(node)
}

function leftMergeNotes({from, into}) {
  into.prepend(...from.childNodes)
  from.remove()
}

function blink({cursor}) {
  setTimeout(() => {
    cursor.style.visibility = "hidden"
    setTimeout(() => {
      cursor.style.visibility = ""
    }, 100)
  }, 100)
}

function isLine(node) {
  return node.classList.contains('line')
}

function isNested(tree) {
  console.assert(isTree(tree), tree)
  return tree.classList.contains('nested')
}
function isFlat(tree) {
  console.assert(isTree(tree), tree)
  return tree.classList.contains('flat')
}

function leftRemove({cursor}) {
  const {parentElement} = cursor
  if (isNote(parentElement)) {
    if (cursor.previousSibling !== null) {
      cursor.previousSibling.remove()
      // if deleted last char, delete note as well
      if (parentElement.childElementCount === 1) {
        const tao = parentElement.parentElement

        tao.appendChild(cursor)
        parentElement.remove()

        // note: only cursor remains
        if (tao.children.length === 1) makeTreeEmpty(tao.parentElement)
      }
    } else {
      const {previousSibling} = parentElement
      if (previousSibling === null) {
        blink({cursor})
      } else if (isOp(previousSibling)) {
        previousSibling.remove()
        if (isLeftOfNote(parentElement)) {
          // todo: extract to leftMergeNote({from, into})
          // mergeNotes(parentElement, cursor.previousSibling)

          leftMergeNotes({
            from: parentElement.previousSibling,
            into: parentElement,
          })
        }
      } else if (isTree(previousSibling)) {
        // todo: transition from nested to flat/empty when deleting last tree
        // select and move to left of tree
        select(previousSibling)
        previousSibling.before(cursor)
        tryLeftEnterNote({cursor})
        console.warn('try backspace tree')
      }
    }
  } else { 
    // cursor in tao
    console.assert(isTao(parentElement), parentElement)
    const {previousSibling} = cursor
    if (previousSibling === null) {
      // todo: backspace at left edge of tree
      // ?select tree and jump out?
      blink({cursor})
    } else if (isTree(previousSibling)) {
      // select and move to left of tree
      select(previousSibling)
      previousSibling.before(cursor)
      tryLeftEnterNote({cursor})
      console.warn('try backspace tree')
    } // todo: else: handle op
  }
}

function isCursor(node) {
  return node.classList.contains('cursor')
}

// todo: use this where appropriate
function isNodeEmpty(node) {
  return [...node.children].filter(c => !isCursor(c)).length === 0
}

document.addEventListener('keydown', (e) => {
  let {key} = e
  console.log(key)

  const {opMode, cursor, selected} = globals
  const {parentElement} = cursor

  // note: opMode takes precedence over navigation and most everything
  if (opMode) {
    // todo: handle Enter, Arrows, etc.
    console.assert(isOp(parentElement), parentElement)
    const ch = Char(key)
    parentElement.appendChild(ch)
    console.assert(isTao(parentElement.parentElement), parentElement.parentElement)
    parentElement.parentElement.appendChild(cursor)
    globals.opMode = false
    return
  }

  // when selection is present, inserting, deleting, etc. works differently
  // in particular insertion causes selection to be replaced which may lead to
  // merging of 3 notes: the inserted one with ones to its left and right
  // ? todo: abstract isAnythingSelected(globals)
  if (selected.length > 0) {
    // todo
    if (key === 'Backspace') {
      // todo: extract to leftRemoveSelection
      for (const node of selected) {
        const left = node.previousSibling
        const right = node.nextSibling

        const tao = node.parentElement

        // todo: transition from nested to flat/empty when deleting last tree
        console.assert(isTree(node), node)
        // ?todo: remove children recursively
        node.remove()

        // note: only cursor remains
        if (isNodeEmpty(tao)) {
          makeTreeEmpty(tao.parentElement)
        } else if ([...tao.children].find(c => isTree(c)) === undefined) {
          tao.parentElement.classList.replace('nested', 'flat')
        }

        if (left === null || right === null) {}
        // todo:
        else if (isNote(left) && isNote(right)) {
          leftMergeNotes({from: left, into: right})
        }
      }
      tryLeftEnterNote({cursor})
      globals.selected = []
    }

    return
  }

  // todo:
  if (['Shift', 'Control', 'Alt'].includes(key)) return

  if (key === 'ArrowLeft') {
    if (isNote(parentElement)) {
      if (cursor.previousSibling !== null) {
        cursor.previousSibling.before(cursor)
      } else {
        leftExitNote({note: parentElement, cursor})
      }
    } else if (isTao(parentElement)) {
      if (cursor.previousSibling !== null) {
        const {previousSibling} = cursor
        if (isNote(previousSibling)) {
          previousSibling.appendChild(cursor)
        } else if (isTree(previousSibling)) {
          leftEnterTree({cursor, tree: previousSibling})
        } else if (isOp(previousSibling)) {
          leftSkipOp({op: previousSibling, cursor})
        } else throw Error('no way')
      } else {
        // todo: leftExitTao
        const tree = parentElement.parentElement
        leftExitTree({tree, cursor})
      }
    }
    return
  }

  if (key === 'ArrowRight') {
    if (isNote(parentElement)) {
      if (cursor.nextSibling !== null) {
        cursor.nextSibling.after(cursor)
      } else {
        rightExitNote({note: parentElement, cursor})
      }
    } else if (isTao(parentElement)) {
      if (cursor.nextSibling !== null) {
        const {nextSibling} = cursor
        if (isNote(nextSibling)) {
          nextSibling.prepend(cursor)
        } else if (isTree(nextSibling)) {
          rightEnterTree({cursor, tree: nextSibling})
        } else if (isOp(nextSibling)) {
          rightSkipOp({op: nextSibling, cursor})
        } else throw Error('no way')
      } else {
        const tree = parentElement.parentElement
        rightExitTree({tree, cursor})
      }
    }
    return
  }

  // todo: proper navigation
  // inside and outside nodes
  // update line, column
  if (key === 'ArrowUp') {
    let node = cursor.previousSibling
    while (true) {
      // todo: handle null
      if (node === null) break
      if (isLine(node)) {
        node.before(cursor)
        break
      }
      node = node.previousSibling
    }

    // ?else start of root?

    // if (globals.line === 0) {
    //   blink({cursor})
    //   return
    // }
    // globals.line -= 1
    // globals.lines[globals.line].before(cursor)
    return
  }

  if (key === 'ArrowDown') {
    let node = cursor.nextSibling
    while (true) {
      // todo: handle null
      if (node === null) break
      if (isLine(node)) {
        node.after(cursor)
        break
      }
      node = node.nextSibling
    }
    return
  }

  if (key === 'Backspace') {
    leftRemove({cursor})
    return
  }

  if (key === '[') {
    insertTree()
    return
  }

  if (key === ']') {
    const tao = isNote(parentElement)?
      parentElement.parentElement:
      parentElement

    exitTree(tao)

    return
  }

  if (key === '`') {
    const tao = isNote(parentElement)?
      parentElement.parentElement:
      parentElement

    appendOp(tao)

    return
  }

  let ch
  if (key === 'Enter') {
    // let parent = pos.parentElement
    // if (parent.className === 'note') {
    //   parent = pos.parentElement
    // }
    // // assuming parent.className = tree
    // // ?todo: assert
    // const rbrace = parent.lastChild

    // todo insert c(\n), c( ) * indent; so they can be deleted separately
    // key = '\n' // + indent
    // todo: handle Control+. key bindings

    // todo:

    // line is a class
    // insertRegular('\n', 'line')
    ch = Char('\n')
    ch.classList.add('line')
    globals.lines.push(ch)
    globals.line += 1
  } else {
    ch = Char(key)
  }
  
  // todo: debug: announce events
  console.log('insert regular')
  insertRegular(ch)
});