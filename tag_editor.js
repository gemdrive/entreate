import { el } from './utils.js';


export function TagEditor(allTags, initSelectedTags) {
  const dom = el('div');
  dom.classList.add('tag-editor');

  const title = el('div');
  title.innerText = "Tags:";
  dom.appendChild(title);

  let tagList = createTagList(initSelectedTags);
  dom.appendChild(tagList);

  let selectedTags = [];

  let select = TagSelect(allTags);
  wireSelect();
  dom.appendChild(select);

  function notifyChanged() {
    select.dispatchEvent(new CustomEvent('tags-changed', {
      bubbles: true,
      detail: {
        tags: selectedTags,
      },
    }));
  }

  function wireSelect() {
    select.addEventListener('tag-selected', (e) => {
      selectTag(e.detail.tagName);
    });
  }

  function selectTag(tagName) {
    if (tagName && !selectedTags.includes(tagName)) {
      selectedTags.push(tagName);
      replaceTagList();
      notifyChanged();
    }
  }

  function createTagList(tags) {
    const tagList = TagList(tags);
    tagList.addEventListener('tag-clicked', (e) => {
      selectedTags = selectedTags.filter(t => t !== e.detail.tag);
      replaceTagList();
      notifyChanged();
    });
    return tagList;
  }

  function replaceTagList() {
    const newTagList = createTagList(selectedTags);
    dom.replaceChild(newTagList, tagList);
    tagList = newTagList;
  }

  function updateTags(newTags) {
    const newSelect = TagSelect(newTags);
    dom.replaceChild(newSelect, select);
    select = newSelect;
    wireSelect();
  }

  for (const tag of initSelectedTags) {
    selectTag(tag);
  }

  return {
    dom,
    updateTags,
  };
}

function TagSelect(allTags) {
  const select = el('select', {
    onchange: (e) => {

      let tagName = select.value;

      select.value = 'choose';

      if (tagName === 'create') {
        const newTag = prompt("Enter a tag");
        if (newTag && !allTags.includes(newTag)) {
          select.dispatchEvent(new CustomEvent('create-tag', {
            bubbles: true,
            detail: {
              tag: newTag,
            },
          }));

          tagName = newTag;
        }
        else {
          alert("Tag already exists");
          return;
        }
      }

      select.dispatchEvent(new CustomEvent('tag-selected', {
        bubbles: true,
        detail: {
          tagName,
        },
      }));
    },
  });

  const firstOption = el('option');
  firstOption.value = 'choose';
  firstOption.innerText = "Select a tag";
  select.appendChild(firstOption);
  for (const tag of allTags) {
    const option = el('option');
    option.setAttribute('value', tag);
    option.innerText = tag;
    select.appendChild(option);
  }
  const addTagOption = el('option');
  addTagOption.setAttribute('value', 'create');
  addTagOption.innerText = "New tag";
  select.appendChild(addTagOption);

  return select;
}


export function TagList(tags) {
  const tagList = el('div');
  tagList.classList.add('tag-list');

  for (const tag of tags) {

    const tagEl = el('div', {
      onclick: (e) => {
        tagList.dispatchEvent(new CustomEvent('tag-clicked', {
          bubbles: true,
          detail: {
            tag,
          }
        }));
      },
    });

    tagEl.classList.add('tag-list__tag');
    tagEl.innerText = tag;
    tagList.appendChild(tagEl);
  }

  return tagList;
}
