/**
 * 变量名转换函数
 * 支持多种命名格式之间的自动转换：
 * snake_case, SNAKE_CASE, kebab-case, dot.notation,
 * 空格分隔, Title Case, camelCase, PascalCase
 * @param {string} str - 输入的变量名
 * @returns {string} - 转换后的变量名
 */
export const transformVarName = function (str) {
  let str2 = str;

  // snake_case 转 SNAKE_CASE
  if (/_[a-z]/.test(str2)) {
    str2 = str2
      .split('_')
      .map((it) => it.toLocaleUpperCase())
      .join('_');
  }
  if (str2 !== str) {
    return str2;
  }

  // SNAKE_CASE 转 kebab-case
  if (/^[A-Z]+(_[A-Z]+)*$/.test(str2)) {
    str2 = str2
      .split('_')
      .map((it) => it.toLocaleLowerCase())
      .join('-');
  }
  if (str2 !== str) {
    return str2;
  }

  // kebab-case 转 dot.notation
  if (/-/.test(str2)) {
    str2 = str2
      .split('-')
      .map((it) => it.toLocaleLowerCase())
      .join('.');
  }
  if (str2 !== str) {
    return str2;
  }

  // dot.notation 转 空格分隔
  if (/\.[a-z]/.test(str2)) {
    str2 = str2.replaceAll(/(\.)([a-z])/g, (_, _2, it) => ' ' + it);
  }
  if (str2 !== str) {
    return str2;
  }

  // 空格分隔 转 Title Case
  if (/\s[a-z]/.test(str2)) {
    str2 = str2.replaceAll(/\s([a-z])/g, (_, it) => ' ' + it.toLocaleUpperCase());
    str2 = str2.substring(0, 1).toLocaleUpperCase() + str2.substring(1);
  }
  if (str2 !== str) {
    return str2;
  }

  // Title Case 转 camelCase
  if (/\s[A-Z]/.test(str2)) {
    str2 = str2.replaceAll(/\s([A-Z])/g, (_, it) => it);
    str2 = str2.substring(0, 1).toLocaleLowerCase() + str2.substring(1);
  }
  if (str2 !== str) {
    return str2;
  }

  // camelCase 转 PascalCase
  if (/^[a-z]+[A-Z]+/.test(str2)) {
    str2 = str2.substring(0, 1).toLocaleUpperCase() + str2.substring(1);
  }
  if (str2 !== str) {
    return str2;
  }

  // PascalCase 转 snake_case
  if (/[^\s][A-Z]/.test(str2)) {
    str2 = str2.replaceAll(/[A-Z]/g, (it, offset) => {
      return (offset == 0 ? '' : '_') + it.toLocaleLowerCase();
    });
  }

  return str2;
};

export default transformVarName;
