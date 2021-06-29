const TABLETOP_PROPS = {
  caption: String,
  head: Array,
  body: Array,
  foot: Array,
};

const TABLE_ATTRIBUTES = ["id", "class"];

module.exports = (content, options) => {
  const {
    // table name / key
    name = undefined,

    // formatters used to render special kind of cells
    format: formatters,

    // hooks used to prepare content
    sanitizeContent = (str) => str,
    strToRows = (str) => str.split("\n\n"),
    strToProps = (str) => str.replace(/^\[/, "").split("|"),
    strToAnchor = (str) =>
      str
        .toLowerCase()
        .replace(/\(.*\)/g, "")
        .replace(/\'/g, "")
        .replace(/\s+/g, "-"),
    anchorRegex = /#([a-z-]+)?$/,

    // filter table cell
    filterTableCellAttributes = ({
      scope,
      colspan,
      format,
      id,
      class: className,
    }) => {
      return {
        id,
        class: className,
        "data-format": format,
        scope,
        colspan,
      };
    },

    // error
    error = (message) => {
      console.log("\x1b[31m", message);
    },

    // hooks to alter each part of the table render output
    renderLink = (str, options) => {
      const anchor = str.match(anchorRegex)[0];
      const text = str.replace(anchor, "");
      return `<a href="${
        anchor === "#" ? "#" + strToAnchor(text) : anchor
      }">${renderText(text, options)}</a>`;
    },
    renderText = (str, options) => {
      // if has link wrap result in a link
      if (anchorRegex.test(str)) return renderLink(str, options);

      // format
      const { context, format = "text", formatters } = options;
      const formatter = formatters[format] || ((v) => v);
      if (context === "head") return str;

      let text = "";
      try {
        text = formatter(str);
      } catch (err) {
        text = err.message;
        error(`"${format}" formatter error "${err.message}" for text "${str}"`);
      }
      return text;
    },
    renderTableCell = (html, options) =>
      h(options.tag || "td", filterTableCellAttributes(options), html),
    renderTableRow = (html, options) => h("tr", html),
    renderTableHeader = (html, options) => h("thead", html),
    renderTableFooter = (html, options) => h("tfoot", html),
    renderTableBody = (html, options) => h("tbody", html),
    renderTableCaption = (text, options) => h("caption", text),
    renderTable = (html, options) =>
      h(
        "table",
        // filter out tabletop props
        Object.entries(options)
          // exclude invalid props
          .filter(
            ([key]) =>
              /^(data-|aria-)/.test(key) || TABLE_ATTRIBUTES.includes(key)
          )
          // turn into attributes
          .reduce((attributes, [key, value]) => {
            attributes[key] = value;
            return attributes;
          }, {}),
        // html to render
        html
      ),
    renderTableContainer = (html, options) => html,

    // hooks to alter data
    willRenderTableHeader = (header, props) => header,
    willRenderTableBody = (body, props) => body,
    willRenderTableFooter = (footer, props) => footer,
  } = options;

  // remove whitespace around content so we don't create blank lines and can be sure the first line is the header
  content = sanitizeContent(trim(content));

  // holds metadata
  const metadata = getMetadata(content, { strToRows, strToProps });

  // get metadata
  const { caption, head, body, foot } = metadata || {};

  // holds rows
  const rows = getBody(content, body, (offset = metadata ? 1 : 0), strToRows);

  // no rows found, exit
  if (!rows.length) return "";

  // props used for rendering the table
  const renderProps = {
    ...metadata,
    name,
    formatters,
    renderText,
    renderTableRow,
    renderTableCell,
  };

  // create table head
  const theadProps = {
    ...renderProps,
    context: "head",
  };

  const thead = head
    ? renderTableHeader(
        renderRow(willRenderTableHeader(head, theadProps), theadProps),
        theadProps
      )
    : "";

  // create table body
  const tbodyProps = {
    ...renderProps,
    context: "body",
  };

  const tbody = renderTableBody(
    renderRows(willRenderTableBody(rows, tbodyProps), tbodyProps),
    tbodyProps
  );

  // create table footer
  const tfootProps = {
    ...renderProps,
    context: "foot",
  };
  const tfoot = foot
    ? renderTableFooter(
        renderRow(willRenderTableFooter(foot, tfootProps), tfootProps),
        tfootProps
      )
    : "";

  // create table caption
  const tcaption = caption ? renderTableCaption(caption, renderProps) : "";

  // create table wrapper
  return renderTableContainer(
    renderTable(`\n${tcaption}\n${thead}\n${tbody}\n${tfoot}\n`, renderProps),
    renderProps
  );
};

const h = (tag, attrs, html) => {
  // shift parameters
  if (typeof attrs === "string") {
    html = attrs;
    attrs = undefined;
  }

  // create attribute string
  const attrStr = attrs ? objectToAttributes(attrs) : "";

  // render html
  return `<${tag}${attrStr.length ? " " : ""}${attrStr}>${html}</${tag}>`;
};

const objectToAttributes = (obj) =>
  Object.entries(obj)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ");

const getMetadata = (str, options) => {
  const { strToRows, strToProps } = options;
  // no headers found
  if (!/^\:/.test(str)) return;

  // get metadata
  return (strToRows(str).splice(0, 1) || [""])
    .join("")
    .split("\n")
    .filter((str) => str.length)
    .reduce((prev, curr) => {
      let [, name, value] = curr.split(":").map(trim);
      if (TABLETOP_PROPS[name] === Array) {
        value = strToProps(value).map(trim);
      } else {
        value = trim(value);
      }
      prev[name] = value;
      return prev;
    }, {});
};

const trim = (str) => str.trim();

const getBody = (str, body = [], offset, strToRows) =>
  strToRows(str)
    .slice(offset)
    .map((block) =>
      block
        .split("\n")
        .map((cell, index) => cell + (body[index] ? ` ${body[index]}` : ""))
    );

const renderCell = (str, options = {}) => {
  const { index, context, renderText, renderTableCell } = options;

  const res = str.match(/[a-z-]+\((.*?)\)/gim) || [];

  const props = res.reduce((prev, curr) => {
    // remove from cell text
    str = str.replace(curr, "").trim();

    // get key value
    const [key, value] = curr.split("(");
    prev[key] = value.substr(0, value.length - 1);
    return prev;
  }, {});

  // format tag / scope
  let { tag, scope } = props;

  // set sane defaults for `tag` if starts with _ and ends with _ is heading
  if (/^_.+_$/.test(str)) {
    tag = "th";
    str = trim(str.substr(1, str.length - 2));
  }
  tag = !tag && context === "head" ? "th" : tag;

  // set sane defaults for `scope`
  if (!scope && tag === "th") {
    if (context === "body") scope = "row";
    if (context === "head") scope = "col";
  }

  // get inner HTML
  const html = renderText(trim(str), { ...options, ...props });

  // render the cell
  return renderTableCell(html, {
    ...props,
    tag,
    index,
    tag,
    scope,
  });
};

const renderRow = (cells, options = {}, index = -1) => {
  const { context, renderTableRow } = options;

  const html = cells
    .map((str, index) =>
      renderCell(str, {
        ...options,
        index,
      })
    )
    .join("\n");

  return `\n${renderTableRow(html, { index, context })}`;
};

const renderRows = (rows, options = {}) =>
  rows.map((cells, i) => renderRow(cells, options, i)).join("\n");
