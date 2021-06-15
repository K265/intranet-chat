const isProduction = process.env.NODE_ENV === 'production';
const { location } = window;
const HOST = location.hostname;
const PORT = isProduction ? location.port || 80 : 80;
export const HP = PORT === 80 ? HOST : `${HOST}:${PORT}`;
export const SERVER_URL = `${location.protocol}//${HP}`;

/*
 * ref: https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
 **/
export function isValidUrl(url: string) {
  const regex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
  return regex.test(url);
}
