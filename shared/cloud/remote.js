// 세이브 문서를 보관하는 원격 저장소. SSOT: 설계 6.3 S2/S5.
//
// 진짜 드라이브 저장소(createDriveRemote)와 테스트용 가짜 저장소(createMemoryRemote)가
// 똑같은 모양( load() / save(doc) )을 갖는다. 이 동일 인터페이스가 자동 검증의 전제다.

import { FILE_NAME } from "./config.js";

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

/**
 * 사용자 드라이브의 이 웹사이트 전용 숨김 폴더(appDataFolder)에 파일 하나를 두고 읽고 쓴다.
 * 사용자의 기존 드라이브 파일은 목록조차 볼 수 없는 권한이다(설계 2.1).
 */
export function createDriveRemote({ getToken, fileName = FILE_NAME, fetchImpl = globalThis.fetch }) {
  let fileId = null;

  async function call(url, init = {}, retry = true) {
    const token = await getToken({ silent: true });
    if (!token) throw new Error("no-token");
    const res = await fetchImpl(url, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
    });
    // 유효기간이 끝난 직후일 수 있으므로 한 번만 다시 받아 재시도한다.
    if (res.status === 401 && retry) {
      const fresh = await getToken({ silent: false });
      if (!fresh) throw new Error("no-token");
      return call(url, init, false);
    }
    if (!res.ok) throw new Error(`drive-${res.status}`);
    return res;
  }

  async function findFileId() {
    if (fileId) return fileId;
    const q = encodeURIComponent(`name='${fileName}' and trashed=false`);
    const res = await call(`${API}/files?spaces=appDataFolder&q=${q}&fields=files(id)&pageSize=1`);
    const data = await res.json();
    fileId = data.files && data.files.length ? data.files[0].id : null;
    return fileId;
  }

  return {
    async load() {
      const id = await findFileId();
      if (!id) return null; // 아직 저장한 적이 없다
      const res = await call(`${API}/files/${id}?alt=media`);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        // 해석할 수 없는 내용은 병합 층이 '읽을 수 없음'으로 처리한다(설계 5.2.10).
        return { schema: -1 };
      }
    },

    async save(doc) {
      const body = JSON.stringify(doc);
      const id = await findFileId();

      if (id) {
        await call(`${UPLOAD}/files/${id}?uploadType=media`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        });
        return { ok: true };
      }

      // 처음 저장할 때만 파일을 만든다. 숨김 폴더 안에 두도록 부모를 지정한다.
      const boundary = "gg-save-boundary";
      const meta = JSON.stringify({ name: fileName, parents: ["appDataFolder"] });
      const multipart =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${body}\r\n` +
        `--${boundary}--`;

      const res = await call(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body: multipart,
      });
      const created = await res.json();
      fileId = created.id || null;
      return { ok: true };
    },
  };
}

/**
 * 메모리 위에서 도는 가짜 저장소. 네트워크·계정 없이 전체 흐름을 검사하기 위한 것.
 * 밑줄로 시작하는 항목은 테스트 제어용이며 실제 코드에서 쓰지 않는다.
 */
export function createMemoryRemote({ initial = null } = {}) {
  let doc = initial ? JSON.parse(JSON.stringify(initial)) : null;
  let failLoad = 0;
  let failSave = 0;
  const calls = { load: 0, save: 0 };

  return {
    async load() {
      calls.load += 1;
      if (failLoad > 0) {
        failLoad -= 1;
        throw new Error("remote-load-failed");
      }
      return doc ? JSON.parse(JSON.stringify(doc)) : null;
    },

    async save(next) {
      calls.save += 1;
      if (failSave > 0) {
        failSave -= 1;
        throw new Error("remote-save-failed");
      }
      doc = JSON.parse(JSON.stringify(next));
      return { ok: true };
    },

    _failNextLoad(n = 1) { failLoad = n; },
    _failNextSave(n = 1) { failSave = n; },
    _calls: calls,
    _peek() { return doc ? JSON.parse(JSON.stringify(doc)) : null; },
  };
}
