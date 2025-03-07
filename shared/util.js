export const getMacroFilename = ({name, source}) => `${source}_${name.slugify({strict: true})}.js`;
