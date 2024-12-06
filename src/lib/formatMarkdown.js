export const formatMarkdown = (markdown) => {
    return markdown? markdown.replace(/\\n/g, "\n").replace("\u2018", "'").replace("u2019", "\u2019").replace("u2013", "\u2013").replace("u2013", "\u2014"): "";
  };
  