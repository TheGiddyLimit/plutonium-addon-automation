// FIXME better sluggification
export const getSlugged = str => str.toLowerCase().replace(/ /g, "-");

export const getMacroFilename = ({name, source}) => `${source}_${getSlugged(name)}.js`;
