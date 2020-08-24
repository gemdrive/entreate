import { el, ValueInput, MarginBox } from './utils.js';
import { TagEditor } from './tag_editor.js';


export function EntryEditor(entryUrl, text, meta, allTags) {
  const dom = el('div');
  dom.classList.add('entreate-entry-editor');

  const homeButton = el('button', {
    onclick: (e) => {
      dom.dispatchEvent(new CustomEvent('close', {
        bubbles: true,
      }));
    },
  });
  homeButton.innerText = 'Home';
  dom.appendChild(homeButton);

  const saveButton = el('button', {
    onclick: (e) => {
      dom.dispatchEvent(new CustomEvent('save', {
        bubbles: true,
        detail: {
          entryUrl,
          text: editor.getValue(),
          meta: Object.assign(meta, {
            title: titleInput.getValue() ? titleInput.getValue() : 'Untitled',
            tags,
          }),
        },
      }));
    },
  });
  saveButton.classList.add('entreate-button', 'entreate-button-confirm');
  saveButton.innerText = 'Save';
  dom.appendChild(saveButton);

  const titleInput = ValueInput('Title', meta.title);
  dom.appendChild(MarginBox(titleInput.dom));

  let tags = meta.tags;
  const tagEditor = TagEditor(allTags, meta.tags);
  dom.appendChild(MarginBox(tagEditor.dom));
  tagEditor.dom.addEventListener('tags-changed', (e) => {
    tags = e.detail.tags;
  });

  let fontSize = 16;
  const decreaseFontBtn = el('button', {
    onclick: () => {
      fontSize -= 1;
      textContainer.style['font-size'] = fontSize + 'px';
    },
  });
  decreaseFontBtn.innerText = "- Font size";
  dom.appendChild(decreaseFontBtn);
  const increaseFontBtn = el('button', {
    onclick: () => {
      fontSize += 1;
      textContainer.style['font-size'] = fontSize + 'px';
    },
  });
  increaseFontBtn.innerText = "+ Font size";
  dom.appendChild(increaseFontBtn);

  const textContainer = el('div');
  textContainer.classList.add('entreate-entry-editor__text');
  dom.appendChild(textContainer);

  const editor = CodeMirror(textContainer, {
    lineNumbers: true,
    value: text,
    //viewportMargin: Infinity,
  });

  // See https://stackoverflow.com/a/19970695/943814
  setTimeout(() => {
    editor.refresh();
  }, 0);


  return {
    dom,
    updateTags: tagEditor.updateTags,
  };
}
