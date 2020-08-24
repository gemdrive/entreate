// https://stackoverflow.com/a/38641281/943814
export const naturalSorter = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
});

export function parseGemData(tsv) {
  return tsv.split('\n')
    .filter(line => line.length > 0)
    .map(line => line.split('\t'))
    .map(columns => ({
      name: columns[0],
      modTime: columns[1],
      size: columns[2],
    }));
}

export function el(elType, options) {
  const dom = document.createElement(elType);

  if (options) {

    for (const key in options) {
      if (key.startsWith('on')) {
        const eventName = key.slice(2);
        dom.addEventListener(eventName, options[key]);
      }
    }

    if (options.classList) {
      for (const cls of options.classList) {
        dom.classList.add(cls);
      }
    }
  }

  return dom;
}

export function ValueInput(name, init) {
  const dom = el('div');
  dom.classList.add('value-input');

  const labelEl = el('span');
  labelEl.classList.add('value-input__label');
  labelEl.innerText = `${name}:`;
  dom.appendChild(labelEl);

  const inputEl = el('input');
  inputEl.classList.add('value-input__text');
  inputEl.setAttribute('type', 'text');
  dom.appendChild(inputEl);

  if (init) {
    inputEl.value = init;
  }

  function getValue() {
    return inputEl.value;
  }

  return {
    dom,
    getValue,
  };
}

export function MarginBox(child) {
  const dom = el('div');
  dom.classList.add('margin-box');
  dom.appendChild(child);
  return dom;
}

export function OptionInput(label, options, initialOption) {
  const dom = el('div');
  dom.classList.add('option-input');

  const labelEl = el('div');
  labelEl.classList.add('option-input__label');
  labelEl.innerText = label + ':';
  dom.appendChild(labelEl);

  const select = el('select', {
    onchange: (e) => {
      select.dispatchEvent(new CustomEvent('option-selected', {
        bubbles: true,
        detail: {
          option: select.value,
        },
      }));
    },
  });

  dom.appendChild(select);

  for (const option of options) {
    const optionEl = el('option');
    optionEl.setAttribute('value', option);
    optionEl.innerText = option;
    select.appendChild(optionEl);
  }

  if (initialOption) {
    select.value = initialOption;
  }

  return dom;
}

export async function* entryIterator(entriesDirUrl, token, comparator) {

  const db = await fetch(`${entriesDirUrl}db.json?access_token=${token}`)
    .then(r => r.json());

  for (let id = db.lastId; id >= 1; id -= 1) {
    const entryPath = idToPath(id);
    yield `${entriesDirUrl}${entryPath}`;
  }
}

export function idToPath(id) {
  const idStr = id.toString().split('').reverse().join('');

  let path = '';
  for (let i = 0; i < idStr.length; i++) {

    if (i % 3 === 0) {
      path = '/' + path;
    }

    path = idStr[i] + path;
  }

  return path;
}

export function entryPathToId(path) {
  return parseInt(path.replace('/', ''));
}
