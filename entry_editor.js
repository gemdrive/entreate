import { el, ValueInput, MarginBox, OptionInput } from './utils.js';
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
    classList: ['entreate-button'],
  });
  homeButton.innerText = 'Home';
  dom.appendChild(homeButton);

  let visibility = meta.visibility ? meta.visibility : 'private';

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
            visibility,
          }),
        },
      }));
    },
    classList: ['entreate-button'],
  });
  saveButton.classList.add('entreate-button', 'entreate-button-confirm');
  saveButton.innerText = 'Save';
  dom.appendChild(saveButton);

  const titleInput = ValueInput('Title', meta.title);
  dom.appendChild(MarginBox(titleInput.dom));

  const visibilityOptionInput = OptionInput('Visibility', ['private', 'friends', 'public'], visibility);
  dom.appendChild(MarginBox(visibilityOptionInput));

  visibilityOptionInput.addEventListener('option-selected', (e) => {
    visibility = e.detail.option;
  });

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
    classList: ['entreate-button'],
  });
  decreaseFontBtn.innerText = "- Font size";
  dom.appendChild(decreaseFontBtn);
  const increaseFontBtn = el('button', {
    onclick: () => {
      fontSize += 1;
      textContainer.style['font-size'] = fontSize + 'px';
    },
    classList: ['entreate-button'],
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
