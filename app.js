/* Lọc cực đại & lọc cực tiểu – bản web của ứng dụng minh họa (Thuyết trình 1 – Đề tài 3 – Nhóm 3)
   Chạy hoàn toàn trên trình duyệt, không cần cài đặt gì. */
"use strict";

const $ = (s) => document.querySelector(s);
const so = (v, k = 1) => v.toFixed(k).replace(".", ",");
const HINH_DANG = ["Vuông", "Chữ thập", "Đĩa tròn", "Đoạn ngang", "Đoạn dọc"];
const MAU = { cam: "#B35A17", xanh: "#1F5F6E", ink: "#1F2D37", do: "#C62828", xam: "#5B6B73" };

// ============================== ẢNH XÁM ==============================
// ảnh = { w, h, d: Uint8ClampedArray }
const taoAnh = (w, h) => ({ w, h, d: new Uint8ClampedArray(w * h) });
const saoChep = (a) => ({ w: a.w, h: a.h, d: new Uint8ClampedArray(a.d) });

function tuCanvas(cv) {
  const ctx = cv.getContext("2d");
  const id = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const a = taoAnh(cv.width, cv.height);
  for (let i = 0, j = 0; i < a.d.length; i++, j += 4) a.d[i] = Math.round(0.299 * id[j] + 0.587 * id[j + 1] + 0.114 * id[j + 2]);
  return a;
}

function tuAnhHTML(img, canhMax = 900) {
  const s = Math.min(1, canhMax / Math.max(img.naturalWidth, img.naturalHeight));
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.naturalWidth * s);
  cv.height = Math.round(img.naturalHeight * s);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return tuCanvas(cv);
}

function anhDuPhong() {                 // dùng khi không đọc được ảnh mẫu
  const a = taoAnh(400, 400);
  for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++)
    a.d[y * 400 + x] = 128 + 60 * (Math.sin(x / 20) + Math.cos(y / 25));
  return a;
}

// ============================== LỌC CỰC ĐẠI / CỰC TIỂU ==============================
// Cửa sổ trượt 1 chiều độ rộng 2r+1 theo hàng (ngang) hoặc cột, dùng hàng đợi đơn điệu: O(1) cho mỗi điểm ảnh.
// Ngoài biên được bỏ qua (tương đương lặp điểm biên vì chỉ lấy max / min).
function truot1D(a, r, ngang, laMax) {
  const { w, h, d } = a;
  const out = new Uint8ClampedArray(w * h);
  const n = ngang ? w : h, m = ngang ? h : w;
  const qi = new Int32Array(n + 2 * r + 2), qv = new Int32Array(n + 2 * r + 2);
  for (let line = 0; line < m; line++) {
    let dau = 0, cuoi = 0;
    for (let idx = -r; idx <= n - 1 + r; idx++) {
      const c = idx < 0 ? 0 : (idx >= n ? n - 1 : idx);
      const v = ngang ? d[line * w + c] : d[c * w + line];
      if (laMax) { while (cuoi > dau && qv[cuoi - 1] <= v) cuoi--; }
      else { while (cuoi > dau && qv[cuoi - 1] >= v) cuoi--; }
      qi[cuoi] = idx; qv[cuoi] = v; cuoi++;
      while (qi[dau] < idx - 2 * r) dau++;
      const p = idx - r;
      if (p >= 0) out[ngang ? line * w + p : p * w + line] = qv[dau];
    }
  }
  return { w, h, d: out };
}

function ketHop(a, b, laMax) {
  const o = taoAnh(a.w, a.h);
  for (let i = 0; i < o.d.length; i++) o.d[i] = laMax ? Math.max(a.d[i], b.d[i]) : Math.min(a.d[i], b.d[i]);
  return o;
}

function nuaRongDia(r, dy) { return Math.round(Math.sqrt(Math.max(0, r * r - dy * dy))); }

// Lọc hình thái với phần tử cấu trúc hình dạng "hinh", kích thước k (số lẻ)
function locHinhThai(a, hinh, k, laMax) {
  if (k <= 1) return saoChep(a);
  const r = (k - 1) >> 1;
  if (hinh === "Đoạn ngang") return truot1D(a, r, true, laMax);
  if (hinh === "Đoạn dọc") return truot1D(a, r, false, laMax);
  if (hinh === "Chữ thập") return ketHop(truot1D(a, r, true, laMax), truot1D(a, r, false, laMax), laMax);
  if (hinh === "Đĩa tròn") {
    const cache = new Map();
    const { w, h } = a;
    const o = taoAnh(w, h);
    o.d.fill(laMax ? 0 : 255);
    for (let dy = -r; dy <= r; dy++) {
      const hw = nuaRongDia(r, dy);
      if (!cache.has(hw)) cache.set(hw, hw === 0 ? a : truot1D(a, hw, true, laMax));
      const src = cache.get(hw).d;
      for (let y = 0; y < h; y++) {
        let yy = y + dy; yy = yy < 0 ? 0 : (yy >= h ? h - 1 : yy);
        const o0 = y * w, s0 = yy * w;
        if (laMax) { for (let x = 0; x < w; x++) if (src[s0 + x] > o.d[o0 + x]) o.d[o0 + x] = src[s0 + x]; }
        else { for (let x = 0; x < w; x++) if (src[s0 + x] < o.d[o0 + x]) o.d[o0 + x] = src[s0 + x]; }
      }
    }
    return o;
  }
  return truot1D(truot1D(a, r, true, laMax), r, false, laMax);       // vuông: tách thành hàng rồi cột
}
const locCucDai = (a, hinh, k) => locHinhThai(a, hinh, k, true);
const locCucTieu = (a, hinh, k) => locHinhThai(a, hinh, k, false);

function matNa(hinh, k) {           // mặt nạ k×k để vẽ phần tử cấu trúc
  const r = (k - 1) >> 1, m = [];
  for (let i = 0; i < k; i++) {
    m.push([]);
    for (let j = 0; j < k; j++) {
      const dy = i - r, dx = j - r;
      let on = true;
      if (hinh === "Chữ thập") on = dx === 0 || dy === 0;
      else if (hinh === "Đĩa tròn") on = Math.abs(dx) <= nuaRongDia(r, dy);
      else if (hinh === "Đoạn ngang") on = dy === 0;
      else if (hinh === "Đoạn dọc") on = dx === 0;
      m[i].push(on);
    }
  }
  return m;
}
function kichThuocChu(hinh, k) {
  if (hinh === "Đoạn ngang") return `1×${k}`;
  if (hinh === "Đoạn dọc") return `${k}×1`;
  return `${k}×${k}`;
}

// Lọc trung vị k×k (thuật toán Huang dùng histogram trượt) – chỉ để so sánh
function trungVi(a, k) {
  const { w, h, d } = a, r = (k - 1) >> 1, o = taoAnh(w, h), nua = (k * k) >> 1;
  const hist = new Int32Array(256);
  const lay = (x, y) => d[(y < 0 ? 0 : y >= h ? h - 1 : y) * w + (x < 0 ? 0 : x >= w ? w - 1 : x)];
  for (let y = 0; y < h; y++) {
    hist.fill(0);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) hist[lay(dx, y + dy)]++;
    for (let x = 0; x < w; x++) {
      if (x > 0) for (let dy = -r; dy <= r; dy++) { hist[lay(x - r - 1, y + dy)]--; hist[lay(x + r, y + dy)]++; }
      let dem = 0, v = 0;
      for (; v < 256; v++) { dem += hist[v]; if (dem > nua) break; }
      o.d[y * w + x] = v;
    }
  }
  return o;
}

// ============================== NHIỄU, ĐÁNH GIÁ ==============================
function ngauNhien(seed) {             // mulberry32: cùng seed cho cùng dãy số
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function themNhieu(a, loai, tiLe, seed) {
  const o = saoChep(a), rnd = ngauNhien(seed), p = tiLe / 100;
  for (let i = 0; i < o.d.length; i++) {
    const r = rnd();
    if (loai === "Muối") { if (r < p) o.d[i] = 255; }
    else if (loai === "Tiêu") { if (r < p) o.d[i] = 0; }
    else { if (r < p / 2) o.d[i] = 0; else if (r > 1 - p / 2) o.d[i] = 255; }
  }
  return o;
}
function psnr(a, b) {
  let s = 0;
  for (let i = 0; i < a.d.length; i++) { const e = a.d[i] - b.d[i]; s += e * e; }
  const mse = s / a.d.length;
  return mse === 0 ? Infinity : 10 * Math.log10(255 * 255 / mse);
}
const chuPsnr = (v) => (v === Infinity ? "trùng khớp ảnh gốc" : `PSNR ${so(v, 2)} dB`);
function batThuong(goc, kq, nguong = 80) {
  let s = 0, t = 0;
  for (let i = 0; i < goc.d.length; i++) { const e = kq.d[i] - goc.d[i]; if (e > nguong) s++; else if (e < -nguong) t++; }
  return [s / goc.d.length * 100, t / goc.d.length * 100];
}
const trungBinh = (a) => a.d.reduce((s, v) => s + v, 0) / a.d.length;
function tru(a, b) { const o = taoAnh(a.w, a.h); for (let i = 0; i < o.d.length; i++) o.d[i] = a.d[i] - b.d[i]; return o; }
function nguongOtsu(a) {
  const hist = new Float64Array(256); for (const v of a.d) hist[v]++;
  const n = a.d.length; let tong = 0; for (let i = 0; i < 256; i++) tong += i * hist[i];
  let wB = 0, sB = 0, tot = -1, t = 0;
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue; const wF = n - wB; if (!wF) break;
    sB += i * hist[i]; const mB = sB / wB, mF = (tong - sB) / wF, g = wB * wF * (mB - mF) ** 2;
    if (g > tot) { tot = g; t = i; }
  }
  return t;
}
function nhiPhan(a, t) { const o = taoAnh(a.w, a.h); for (let i = 0; i < o.d.length; i++) o.d[i] = a.d[i] > t ? 255 : 0; return o; }
const tiLeTrang = (a) => a.d.reduce((s, v) => s + (v > 0 ? 1 : 0), 0) / a.d.length * 100;
function vungGiua(a) { const h = Math.round(a.h * 0.36), w = Math.round(a.w * 0.42); return [Math.round(a.h * 0.26), h, (a.w - w) >> 1, w]; }

function anhChu(doKhongDeu) {
  const W = 760, H = 250, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d");
  c.fillStyle = "rgb(60,60,60)"; c.fillRect(0, 0, W, H);
  c.fillStyle = "rgb(225,225,225)"; c.font = "bold 62px Arial, sans-serif"; c.textBaseline = "top";
  c.fillText("LỌC CỰC ĐẠI", 34, 36); c.fillText("LỌC CỰC TIỂU", 34, 140);
  const a = tuCanvas(cv);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nen = doKhongDeu * Math.exp(-((x - W * 0.97) ** 2 + (y - 10) ** 2) / (2 * (W * 0.42) ** 2));
    a.d[y * W + x] = Math.min(255, a.d[y * W + x] + nen);
  }
  return a;
}

// ============================== HIỂN THỊ ==============================
const boDem = new WeakMap();      // ảnh -> canvas RGBA tạm
function canvasCua(a) {
  if (boDem.has(a)) return boDem.get(a);
  const cv = document.createElement("canvas"); cv.width = a.w; cv.height = a.h;
  const ctx = cv.getContext("2d"), id = ctx.createImageData(a.w, a.h);
  for (let i = 0, j = 0; i < a.d.length; i++, j += 4) { id.data[j] = id.data[j + 1] = id.data[j + 2] = a.d[i]; id.data[j + 3] = 255; }
  ctx.putImageData(id, 0, 0); boDem.set(a, cv); return cv;
}

function khung(cha, tieuDe, cao, mau = MAU.ink) {
  const el = document.createElement("div"); el.className = "khung";
  el.innerHTML = `<div class="tieu"></div><canvas></canvas><div class="cap"></div>`;
  cha.appendChild(el);
  const k = { el, tieu: el.querySelector(".tieu"), cv: el.querySelector("canvas"), cap: el.querySelector(".cap"), cao, anh: null, vung: null, chu: "" };
  k.tieu.textContent = tieuDe; k.tieu.style.color = mau;
  return k;
}

function veKhung(k, a, cap = "", vung = null, tieuDe = null, mau = null) {
  if (tieuDe !== null) k.tieu.textContent = tieuDe;
  if (mau) k.tieu.style.color = mau;
  k.anh = a; k.vung = vung; k.chu = cap;
  const dpr = window.devicePixelRatio || 1, cw = k.cv.clientWidth || 300, ch = k.cao;
  k.cv.style.height = ch + "px";
  k.cv.width = Math.round(cw * dpr); k.cv.height = Math.round(ch * dpr);
  const ctx = k.cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#F2F5F6"; ctx.fillRect(0, 0, cw, ch);
  if (!a) {
    ctx.fillStyle = "#5B6B73"; ctx.font = "15px Segoe UI, Arial"; ctx.textAlign = "center";
    ctx.fillText(cap || "…", cw / 2, ch / 2); k.cap.textContent = ""; return;
  }
  let [sy, sh, sx, sw] = vung || [0, a.h, 0, a.w];
  const s = Math.min(cw / sw, ch / sh), dw = sw * s, dh = sh * s;
  ctx.imageSmoothingEnabled = s < 1.4;
  ctx.drawImage(canvasCua(a), sx, sy, sw, sh, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  k.cap.textContent = cap;
}
const veLai = (ds) => ds.forEach((k) => k.anh !== undefined && veKhung(k, k.anh, k.chu, k.vung));

function ghiChu(id, chu, sai = false) { const el = $(id); el.textContent = chu; el.classList.toggle("sai", sai); }
function chonHinh(sel) { sel.innerHTML = HINH_DANG.map((h) => `<option>${h}</option>`).join(""); }
const radio = (ten) => document.querySelector(`input[name="${ten}"]:checked`).value;

// ============================== TRẠNG THÁI CHUNG ==============================
let IMG = null, TEN_ANH = "anh_mau.jpg";
const TABS = {};

// ============================== TAB 1: CỬA SỔ TRƯỢT ==============================
const MA_TRAN_SLIDE = [[12, 15, 14, 10, 11], [13, 200, 16, 12, 10], [11, 14, 15, 13, 12], [10, 12, 0, 14, 11], [12, 13, 14, 15, 13]];
TABS.t1 = (() => {
  let f = MA_TRAN_SLIDE.map((r) => r.slice()), buoc = 0, hen = null;
  const VI_TRI = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) VI_TRI.push([r, c]);
  const cua = (r, c) => { const v = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) v.push(f[r + i][c + j]); return v; };

  function ve() {
    let hl = null; if (buoc) hl = VI_TRI[buoc - 1];
    $("#t1In").innerHTML = f.map((row) => row.map((v) => `<div class="${v >= 200 ? "muoi" : v === 0 ? "tieu" : ""}">${v}</div>`).join("")).join("");
    const cs = $("#t1Cua");
    cs.style.display = hl ? "block" : "none";
    if (hl) { cs.style.setProperty("--r", hl[0]); cs.style.setProperty("--c", hl[1]); }
    const kq = (laMax) => VI_TRI.map(([r, c], k) => {
      const ws = cua(r, c), v = laMax ? Math.max(...ws) : Math.min(...ws);
      return `<div class="${k >= buoc ? "trong" : ""} ${k === buoc - 1 ? "hien-tai" : ""}">${v}</div>`;
    }).join("");
    $("#t1Max").innerHTML = kq(true); $("#t1Min").innerHTML = kq(false);
    const g = $("#t1Giua");
    if (!buoc) {
      g.innerHTML = `<div class="ghi-lon" style="color:#5B6B73;font-weight:400;margin-top:60px">Bấm “Tiếp →” để đặt cửa sổ 3×3<br>vào vị trí đầu tiên.</div>`;
      ghiChu("#t1Ghi", "Ô xanh đậm là điểm nhiễu muối (200), ô xám là điểm nhiễu tiêu (0). Ảnh ra có kích thước 3×3 vì nhóm dùng kiểu bỏ qua biên.");
      return;
    }
    const [r, c] = VI_TRI[buoc - 1], w9 = cua(r, c), s9 = w9.slice().sort((a, b) => a - b);
    let html = `<div class="h">Vị trí ${buoc}/9 – 9 giá trị trong cửa sổ:</div><div class="day">${w9.map((v) => `<div>${v}</div>`).join("")}</div>`;
    html += `<div class="h">Sắp xếp tăng dần:</div><div class="day sx">${s9.map((v, k) => `<div class="${k === 0 ? "min" : k === 8 ? "max" : ""}">${v}</div>`).join("")}</div>`;
    html += `<div class="nhan-mm"><span class="xanh">min</span><span class="cam">max</span></div>`;
    html += `<div class="ghi-lon cam">→ Lọc cực đại ghi ${s9[8]}</div><div class="ghi-lon xanh">→ Lọc cực tiểu ghi ${s9[0]}</div>`;
    if (buoc === 9) {
      let n200 = 0, n0 = 0;
      VI_TRI.forEach(([rr, cc]) => { const ws = cua(rr, cc); if (Math.max(...ws) === 200) n200++; if (Math.min(...ws) === 0) n0++; });
      html += `<div class="ket-luan"><b>Kết luận sau 9 vị trí:</b><br>• Lọc cực đại xóa điểm 0, nhưng điểm 200 lan ra ${n200} ô.<br>• Lọc cực tiểu xóa điểm 200, nhưng điểm 0 lan ra ${n0} ô.<br>→ Mỗi phép chỉ xử lý được một loại nhiễu.</div>`;
    }
    g.innerHTML = html;
    ghiChu("#t1Ghi", `Bước ${buoc}/9: cửa sổ có tâm tại hàng ${r + 2}, cột ${c + 2}. Sau khi sắp xếp, phần tử đầu (${s9[0]}) là kết quả lọc cực tiểu, phần tử cuối (${s9[8]}) là kết quả lọc cực đại.`);
  }
  const dung = () => { if (hen) { clearInterval(hen); hen = null; } };
  const tiep = () => { if (buoc < 9) { buoc++; ve(); } else dung(); };
  $("#t1Tiep").onclick = () => { dung(); tiep(); };
  $("#t1Lui").onclick = () => { dung(); if (buoc > 0) { buoc--; ve(); } };
  $("#t1Lai").onclick = () => { dung(); buoc = 0; ve(); };
  $("#t1Chay").onclick = () => {
    if (hen) return dung();
    if (buoc >= 9) buoc = 0;
    tiep(); hen = setInterval(tiep, +$("#t1Toc").value);
  };
  $("#t1Toc").oninput = (e) => { $("#t1TocV").textContent = e.target.value; if (hen) { dung(); hen = setInterval(tiep, +e.target.value); } };
  $("#t1Slide").onclick = () => { dung(); f = MA_TRAN_SLIDE.map((r) => r.slice()); buoc = 0; ve(); };
  $("#t1Ngau").onclick = () => {
    dung(); f = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => 10 + Math.floor(Math.random() * 11)));
    const a = Math.floor(Math.random() * 25); let b; do { b = Math.floor(Math.random() * 25); } while (b === a);
    f[(a / 5) | 0][a % 5] = 200; f[(b / 5) | 0][b % 5] = 0; buoc = 0; ve();
  };
  return { capNhat: ve, veLai: () => {} };
})();

// ============================== TAB 2: LỌC MAX / MIN ==============================
TABS.t2 = (() => {
  chonHinh($("#t2Hinh"));
  const p = $("#t2P"), k1 = khung(p, "Ảnh gốc", 470), k2 = khung(p, "Sau lọc", 470, MAU.cam);
  p.querySelectorAll(".khung").forEach((e) => (e.style.width = "calc((100% - 14px) / 2)"));
  function veSe(hinh, k, laMax) {
    const cv = $("#t2Se"), c = cv.getContext("2d"), n = 21, o = cv.width / n, m = matNa(hinh, k), off = (n - k) >> 1;
    c.clearRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const ii = i - off, jj = j - off, on = ii >= 0 && jj >= 0 && ii < k && jj < k && m[ii][jj];
      c.fillStyle = on ? (laMax ? "#E07B39" : "#2F7A8C") : "#F2F5F6"; c.fillRect(j * o + 0.5, i * o + 0.5, o - 1, o - 1);
    }
  }
  function capNhat() {
    const k = +$("#t2K").value, hinh = $("#t2Hinh").value, laMax = radio("t2Kieu") === "max";
    $("#t2KV").textContent = k; veSe(hinh, k, laMax);
    const kq = laMax ? locCucDai(IMG, hinh, k) : locCucTieu(IMG, hinh, k);
    const vung = $("#t2Zoom").checked ? vungGiua(IMG) : null, m0 = trungBinh(IMG), m1 = trungBinh(kq);
    veKhung(k1, IMG, `Độ sáng trung bình: ${so(m0)}`, vung);
    veKhung(k2, kq, `Độ sáng trung bình: ${so(m1)}`, vung,
      `Sau ${laMax ? "lọc cực đại" : "lọc cực tiểu"} ${kichThuocChu(hinh, k)} (${hinh.toLowerCase()})`, laMax ? MAU.cam : MAU.xanh);
    ghiChu("#t2Ghi", k === 1 ? "Cửa sổ 1×1 chỉ chứa chính điểm ảnh nên ảnh không đổi." : laMax
      ? `Lọc cực đại thay mỗi điểm bằng giá trị lớn nhất trong cửa sổ: ảnh sáng lên (${so(m0)} → ${so(m1)}), vùng sáng nở ra theo đúng hình dạng cửa sổ, chi tiết tối nhỏ biến mất.`
      : `Lọc cực tiểu thay mỗi điểm bằng giá trị nhỏ nhất trong cửa sổ: ảnh tối đi (${so(m0)} → ${so(m1)}), vùng sáng co lại, chi tiết sáng nhỏ biến mất.`);
  }
  ["#t2K", "#t2Hinh", "#t2Zoom"].forEach((s) => $(s).addEventListener("input", capNhat));
  document.querySelectorAll('input[name="t2Kieu"]').forEach((e) => e.addEventListener("change", capNhat));
  return { capNhat, veLai: () => veLai([k1, k2]) };
})();

// ============================== TAB 3: KHỬ NHIỄU ==============================
TABS.t3 = (() => {
  let seed = 1;
  const p = $("#t3P"), k1 = khung(p, "Ảnh gốc", 420), k2 = khung(p, "Ảnh bị nhiễu", 420, MAU.do), k3 = khung(p, "Sau lọc", 420, MAU.xanh);
  p.querySelectorAll(".khung").forEach((e) => (e.style.width = "calc((100% - 28px) / 3)"));
  function capNhat() {
    const loai = radio("t3Loai"), md = +$("#t3M").value, loc = radio("t3Loc"), k = +radio("t3K");
    $("#t3MV").textContent = md;
    const nh = themNhieu(IMG, loai, md, seed);
    let kq, ten, mau;
    if (loc === "min") { kq = locCucTieu(nh, "Vuông", k); ten = "lọc cực tiểu"; mau = MAU.xanh; }
    else if (loc === "max") { kq = locCucDai(nh, "Vuông", k); ten = "lọc cực đại"; mau = MAU.cam; }
    else { kq = trungVi(nh, k); ten = "lọc trung vị"; mau = MAU.xam; }
    const vung = $("#t3Zoom").checked ? vungGiua(IMG) : null;
    const [s0, t0] = batThuong(IMG, nh), [s1, t1] = batThuong(IMG, kq);
    veKhung(k1, IMG, `Độ sáng trung bình: ${so(trungBinh(IMG))}`, vung);
    veKhung(k2, nh, `${chuPsnr(psnr(IMG, nh))}\nĐiểm sáng bất thường ${so(s0, 2)} % · tối bất thường ${so(t0, 2)} %`, vung, `Ảnh bị nhiễu ${loai.toLowerCase()} ${md} %`);
    veKhung(k3, kq, `${chuPsnr(psnr(IMG, kq))}\nĐiểm sáng bất thường ${so(s1, 2)} % · tối bất thường ${so(t1, 2)} %`, vung, `Sau ${ten} ${k}×${k}`, mau);
    const goiY = loai === "Muối" ? "Nhiễu muối là các chấm trắng (255) → nên dùng LỌC CỰC TIỂU."
      : loai === "Tiêu" ? "Nhiễu tiêu là các chấm đen (0) → nên dùng LỌC CỰC ĐẠI."
        : "Có cả chấm trắng lẫn chấm đen → một phép lọc riêng lẻ không đủ; xem tab 4 (mở – đóng) hoặc dùng lọc trung vị.";
    const dung = (loai === "Muối" && loc === "min") || (loai === "Tiêu" && loc === "max");
    const sai = (loai === "Muối" && loc === "max") || (loai === "Tiêu" && loc === "min");
    ghiChu("#t3Ghi", goiY + (dung ? "\n\n✔ Chọn đúng bộ lọc: các điểm nhiễu đã bị xóa." : sai ? "\n\n✘ Chọn sai bộ lọc: điểm nhiễu không mất mà còn lan rộng ra." : ""), sai);
  }
  document.querySelectorAll('input[name="t3Loai"], input[name="t3Loc"], input[name="t3K"]').forEach((e) => e.addEventListener("change", capNhat));
  ["#t3M", "#t3Zoom"].forEach((s) => $(s).addEventListener("input", capNhat));
  $("#t3Moi").onclick = () => { seed++; capNhat(); };
  return { capNhat, veLai: () => veLai([k1, k2, k3]) };
})();

// ============================== TAB 4: MỞ – ĐÓNG TỪNG BƯỚC ==============================
TABS.t4 = (() => {
  const BUOC = [
    ["Bước 1 · Lọc cực tiểu", MAU.xanh, "Lọc cực tiểu xóa các chấm trắng (nhiễu muối), nhưng chấm đen (nhiễu tiêu) lan rộng ra và ảnh tối đi."],
    ["Bước 2 · Lọc cực đại = PHÉP MỞ", MAU.cam, "Lọc cực đại trả vật thể về gần kích thước cũ. Min rồi max chính là phép mở: hết chấm trắng, còn chấm đen."],
    ["Bước 3 · Lọc cực đại", MAU.cam, "Bắt đầu phép đóng: lọc cực đại xóa các chấm đen còn sót lại, ảnh sáng lên."],
    ["Bước 4 · Lọc cực tiểu = MỞ RỒI ĐÓNG", MAU.xanh, "Lọc cực tiểu trả độ sáng về như cũ. Mở rồi đóng đã khử được cả hai loại nhiễu."],
    ["So sánh · Lọc trung vị 3×3", MAU.xam, "Lọc trung vị lấy phần tử ở giữa nên bỏ qua cả hai giá trị cực biên – với nhiễu muối tiêu nó cho kết quả tốt nhất."],
  ];
  let seed = 3, buoc = 0, anh = [];
  const p = $("#t4P"), ks = [khung(p, "Ảnh nhiễu muối tiêu", 250, MAU.do)].concat(BUOC.map(([t, m]) => khung(p, t, 250, m)));
  function tinh() {
    const md = +$("#t4M").value; $("#t4MV").textContent = md;
    const nh = themNhieu(IMG, "Muối tiêu", md, seed);
    const b1 = locCucTieu(nh, "Vuông", 3), b2 = locCucDai(b1, "Vuông", 3), b3 = locCucDai(b2, "Vuông", 3), b4 = locCucTieu(b3, "Vuông", 3);
    anh = [nh, b1, b2, b3, b4, trungVi(nh, 3)];
    ve();
  }
  function ve() {
    const vung = $("#t4Zoom").checked ? vungGiua(IMG) : null;
    ks.forEach((k, i) => {
      if (i === 0 || i <= buoc) {
        const [s, t] = batThuong(IMG, anh[i]);
        veKhung(k, anh[i], `${chuPsnr(psnr(IMG, anh[i]))}\nchấm sáng bất thường ${so(s, 2)} % · tối ${so(t, 2)} %`, vung);
      } else veKhung(k, null, "Bấm “Bước tiếp” để xem");
    });
    ghiChu("#t4Ghi", buoc === 0 ? "Ảnh có cả chấm trắng (muối) và chấm đen (tiêu). Mỗi bước dùng cửa sổ 3×3. PSNR càng cao thì ảnh càng giống ảnh gốc." : BUOC[buoc - 1][2]);
  }
  $("#t4M").addEventListener("input", tinh);
  $("#t4Zoom").addEventListener("input", ve);
  $("#t4Moi").onclick = () => { seed++; tinh(); };
  $("#t4Tiep").onclick = () => { if (buoc < 5) { buoc++; ve(); } };
  $("#t4Het").onclick = () => { buoc = 5; ve(); };
  $("#t4Lai").onclick = () => { buoc = 0; ve(); };
  return { capNhat: tinh, veLai: () => ve() };
})();

// ============================== TAB 5: TÁCH BIÊN ==============================
TABS.t5 = (() => {
  chonHinh($("#t5Hinh"));
  const p = $("#t5P");
  const ks = [khung(p, "Ảnh gốc", 260), khung(p, "Lọc cực đại", 260, MAU.cam), khung(p, "Lọc cực tiểu", 260, MAU.xanh),
    khung(p, "Gradient = max − min", 260), khung(p, "Điểm biên (vượt ngưỡng)", 260)];
  function capNhat() {
    const k = +$("#t5K").value, hinh = $("#t5Hinh").value, ng = +$("#t5N").value;
    $("#t5KV").textContent = k; $("#t5NV").textContent = ng;
    const mx = locCucDai(IMG, hinh, k), mn = locCucTieu(IMG, hinh, k), gr = tru(mx, mn), np = nhiPhan(gr, ng);
    const tl = tiLeTrang(np), vung = $("#t5Zoom").checked ? vungGiua(IMG) : null;
    veKhung(ks[0], IMG, "", vung); veKhung(ks[1], mx, "", vung); veKhung(ks[2], mn, "", vung);
    veKhung(ks[3], gr, `Giá trị trung bình ${so(trungBinh(gr))}`, vung);
    veKhung(ks[4], np, `${so(tl, 2)} % số điểm là điểm biên`, vung);
    ghiChu("#t5Ghi", `Gradient hình thái cho đường viền khép kín. Cửa sổ càng lớn viền càng dày. Với ngưỡng ${ng}, có ${so(tl, 2)} % số điểm ảnh được xem là điểm biên.`);
  }
  ["#t5K", "#t5Hinh", "#t5N", "#t5Zoom"].forEach((s) => $(s).addEventListener("input", capNhat));
  return { capNhat, veLai: () => veLai(ks) };
})();

// ============================== TAB 6: TOP-HAT ==============================
TABS.t6 = (() => {
  const p = $("#t6P");
  const ks = [khung(p, "Ảnh chữ – nền sáng không đều", 175), khung(p, "Nhị phân trực tiếp (ngưỡng Otsu)", 175, MAU.do),
    khung(p, "Top-hat: ảnh gốc − phép mở", 175, MAU.xanh), khung(p, "Top-hat rồi nhị phân (ngưỡng Otsu)", 175, MAU.xanh)];
  function capNhat() {
    const nen = +$("#t6N").value, k = +$("#t6K").value;
    $("#t6NV").textContent = nen; $("#t6KV").textContent = k;
    const a = anhChu(nen);
    const mo = locCucDai(locCucTieu(a, "Đĩa tròn", k), "Đĩa tròn", k);      // phép mở: min rồi max
    const th = tru(a, mo), b1 = nhiPhan(a, nguongOtsu(a)), b2 = nhiPhan(th, nguongOtsu(th));
    const p1 = tiLeTrang(b1), p2 = tiLeTrang(b2);
    veKhung(ks[0], a); veKhung(ks[1], b1, `${so(p1, 2)} % điểm trắng`); veKhung(ks[2], th); veKhung(ks[3], b2, `${so(p2, 2)} % điểm trắng`);
    ghiChu("#t6Ghi", k < 15 ? "Cửa sổ quá nhỏ (nhỏ hơn nét chữ): phép mở xóa luôn cả chữ khỏi “nền”, nên top-hat làm mất một phần nét chữ. Hãy tăng kích thước lên."
      : `Nhị phân trực tiếp: ${so(p1, 2)} % điểm trắng (dính cả mảng nền sáng). Sau top-hat: ${so(p2, 2)} % – chỉ còn đúng nét chữ.`);
  }
  ["#t6N", "#t6K"].forEach((s) => $(s).addEventListener("input", capNhat));
  return { capNhat, veLai: () => veLai(ks) };
})();

// ============================== ĐIỀU KHIỂN CHUNG ==============================
let tabHienTai = "t1";
const daVe = new Set();
function canGiuaTab() {               // màn hình hẹp: cuộn thanh tab để thấy tab đang mở
  const nav = $("#tabs"), b = nav.querySelector("button.active");
  if (b) nav.scrollLeft = b.offsetLeft - (nav.clientWidth - b.offsetWidth) / 2;
}
function moTab(id) {
  tabHienTai = id;
  document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
  canGiuaTab();
  document.querySelectorAll(".tab").forEach((s) => s.classList.toggle("active", s.id === id));
  if (IMG && !daVe.has(id)) { TABS[id].capNhat(); daVe.add(id); }   // chỉ tính khi tab được mở lần đầu
  else if (IMG) TABS[id].veLai();
  history.replaceState(null, "", "#" + id);
}
document.querySelectorAll("#tabs button").forEach((b) => (b.onclick = () => moTab(b.dataset.tab)));

function datAnh(a, ten) {
  IMG = a; TEN_ANH = ten; daVe.clear();
  $("#status").textContent = `Ảnh đang dùng: ${ten} (${a.w}×${a.h} điểm ảnh, ảnh xám) · Toàn bộ xử lý chạy ngay trên trình duyệt của bạn, không gửi ảnh đi đâu cả.`;
  TABS[tabHienTai].capNhat(); daVe.add(tabHienTai);
}

function napAnhMau() {
  const img = new Image();
  img.onload = () => {
    try { datAnh(tuAnhHTML(img), "anh_mau.jpg"); }
    catch (e) { datAnh(anhDuPhong(), "ảnh tổng hợp (hãy mở trang qua web server hoặc GitHub Pages để dùng ảnh mẫu)"); }
  };
  img.onerror = () => datAnh(anhDuPhong(), "ảnh tổng hợp (không tìm thấy anh_mau.jpg)");
  img.src = "anh_mau.jpg";
}

$("#moAnh").addEventListener("change", (e) => {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => { const img = new Image(); img.onload = () => datAnh(tuAnhHTML(img), file.name); img.src = r.result; };
  r.readAsDataURL(file); e.target.value = "";
});
$("#anhMau").onclick = napAnhMau;

let hoan = null;
window.addEventListener("resize", () => {
  clearTimeout(hoan);
  hoan = setTimeout(() => { canGiuaTab(); if (IMG) TABS[tabHienTai].veLai(); }, 150);
});

TABS.t1.capNhat();
const dau = (location.hash || "#t1").slice(1);
if (TABS[dau]) moTab(dau);
window.addEventListener("load", canGiuaTab);
napAnhMau();
