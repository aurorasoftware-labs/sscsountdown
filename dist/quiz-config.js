// Cloudflare Pages serves /api/quiz. Firebase Hosting remains a static mirror.
const firebaseMirror=/\.(web\.app|firebaseapp\.com)$/.test(globalThis.location?.hostname||'');
export default {endpoint:firebaseMirror?'':'/api/quiz'};
