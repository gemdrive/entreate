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

export async function* entryIterator(entriesDirUrl, token, comparator) {

  const yearRes = await fetch(`${entriesDirUrl}.gemdrive-ls.json?access_token=${token}`);
  const yearsGemData = await yearRes.json();
  const years = Object.keys(yearsGemData.children).filter(n => n.endsWith('/'));
  const yearsSorted = comparator ? years.slice().sort(comparator) : years;

  for (const year of yearsSorted) {
    const yearUrl = entriesDirUrl + year;

    for await (const entry of yearIterator(yearUrl, token, comparator)) {
      yield entry;
    }
  }
}

async function* yearIterator(yearDirUrl, token, comparator) {
  const monthRes = await fetch(`${yearDirUrl}.gemdrive-ls.json?access_token=${token}`);
  const monthsGemData = await monthRes.json();
  const months = Object.keys(monthsGemData.children).filter(m => m.endsWith('/'));
  const monthsSorted = comparator ? months.slice().sort(comparator) : months;

  for (const month of monthsSorted) {
    const monthUrl = yearDirUrl + month;

    for await (const entry of monthIterator(monthUrl, token, comparator)) {
      yield entry;
    }
  }
}

async function* monthIterator(monthDirUrl, token, comparator) {
  const dayRes = await fetch(`${monthDirUrl}.gemdrive-ls.json?access_token=${token}`);
  const daysGemData = await dayRes.json();
  const days = Object.keys(daysGemData.children).filter(m => m.endsWith('/'));
  const daysSorted = comparator ? days.slice().sort(comparator) : days;

  for (const day of daysSorted) {
    const dayUrl = monthDirUrl + day;

    for await (const entry of dayIterator(dayUrl, token, comparator)) {
      yield entry;
    }
  }
}

async function* dayIterator(dayDirUrl, token, comparator) {
  const entryRes = await fetch(`${dayDirUrl}.gemdrive-ls.json?access_token=${token}`);
  const entriesGemData = await entryRes.json();
  const entries = Object.keys(entriesGemData.children).filter(m => m.endsWith('/'));
  const entriesSorted = comparator ? entries.slice().sort(comparator) : entries;

  for (const entry of entriesSorted) {
    const entryUrl = dayDirUrl + entry;

    yield entryUrl;
  }
}
