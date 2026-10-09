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
  const ox = (cw - dw) / 2, oy = (ch - dh) / 2;
  ctx.drawImage(canvasCua(a), sx, sy, sw, sh, ox, oy, dw, dh);
  k.tf = { sx, sy, s, ox, oy };
  if (k.diem) {                     // khung đỏ: vị trí cửa sổ đang soi
    const { x, y, r } = k.diem;
    if (x >= sx && x < sx + sw && y >= sy && y < sy + sh) {
      const cx = ox + (x + 0.5 - sx) * s, cy = oy + (y + 0.5 - sy) * s, d = Math.max((2 * r + 1) * s, 10);
      for (const [mau, net] of [["#fff", 4], [MAU.do, 2]]) {
        ctx.strokeStyle = mau; ctx.lineWidth = net; ctx.strokeRect(cx - d / 2, cy - d / 2, d, d);
        ctx.beginPath();
        ctx.moveTo(cx - d / 2 - 9, cy); ctx.lineTo(cx - d / 2 - 2, cy); ctx.moveTo(cx + d / 2 + 2, cy); ctx.lineTo(cx + d / 2 + 9, cy);
        ctx.moveTo(cx, cy - d / 2 - 9); ctx.lineTo(cx, cy - d / 2 - 2); ctx.moveTo(cx, cy + d / 2 + 2); ctx.lineTo(cx, cy + d / 2 + 9);
        ctx.stroke();
      }
    }
  }
  if (k.hang != null) {             // vạch đánh dấu hàng ảnh được cắt ra vẽ biểu đồ
    const yy = oy + (k.hang + 0.5 - sy) * s;
    ctx.strokeStyle = MAU.do; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(ox, yy); ctx.lineTo(ox + dw, yy); ctx.stroke(); ctx.setLineDash([]);
  }
  k.cap.textContent = cap;
}

// Bấm lên ảnh trong khung -> tọa độ điểm ảnh
function chonDiem(k, cb) {
  k.cv.style.cursor = "crosshair";
  k.cv.addEventListener("click", (e) => {
    if (!k.anh || !k.tf) return;
    const b = k.cv.getBoundingClientRect(), t = k.tf;
    const x = Math.floor((e.clientX - b.left - t.ox) / t.s + t.sx), y = Math.floor((e.clientY - b.top - t.oy) / t.s + t.sy);
    if (x >= 0 && y >= 0 && x < k.anh.w && y < k.anh.h) cb(x, y);
  });
}
const veLai = (ds) => ds.forEach((k) => k.anh !== undefined && veKhung(k, k.anh, k.chu, k.vung));

function ghiChu(id, chu, sai = false) { const el = $(id); el.textContent = chu; el.classList.toggle("sai", sai); }
function chonHinh(sel) { sel.innerHTML = HINH_DANG.map((h) => `<option>${h}</option>`).join(""); }
const radio = (ten) => document.querySelector(`input[name="${ten}"]:checked`).value;

// ============================== KHỐI GIẢI THÍCH ==============================
const the = (tieu, noiDung, lop = "") => `<div class="gt ${lop}"><h3>${tieu}</h3>${noiDung}</div>`;
const dsBuoc = (ds, hien = -1) => `<ol class="buoc">${ds.map((t, i) => `<li class="${i === hien ? "hien" : ""}">${t}</li>`).join("")}</ol>`;
const dsCham = (ds) => `<ul class="cham">${ds.map((t) => `<li>${t}</li>`).join("")}</ul>`;
const chip = (vs, lop = () => "") => `<span class="chip-day">${vs.map((v, i) => `<span class="${lop(v, i)}">${v}</span>`).join("")}</span>`;
const nghin = (n) => Math.round(n).toLocaleString("vi-VN");
const kep = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const demO = (m) => m.reduce((s, hang) => s + hang.filter(Boolean).length, 0);

// Soi cửa sổ tại (x, y): vẽ các ô của cửa sổ, sắp xếp và chỉ ra giá trị được chọn
function soiCuaSo(el, a, x, y, mask, kieu, them = "") {
  const k = mask.length, r = (k - 1) >> 1, o = k <= 9 ? 30 : k <= 15 ? 19 : 12, coSo = k <= 11;
  const lay = (i, j) => a.d[(y + i - r) * a.w + (x + j - r)];
  const ds = [];
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) if (mask[i][j]) ds.push(lay(i, j));
  const sx = ds.slice().sort((p, q) => p - q), N = sx.length, viTri = kieu === "max" ? N - 1 : kieu === "min" ? 0 : N >> 1, kq = sx[viTri];
  let daChon = false, o9 = "";
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) {
    const v = lay(i, j), on = mask[i][j];
    let cls = on ? "" : "ngoai";
    if (i === r && j === r) cls += " tam";
    if (on && !daChon && v === kq) { cls += " chon-" + kieu; daChon = true; }
    o9 += `<div class="${cls}" style="background:rgb(${v},${v},${v});color:${v > 140 ? "#1F2D37" : "#fff"}" title="điểm (${x + j - r}, ${y + i - r}) = ${v}">${coSo && on ? v : ""}</div>`;
  }
  const lopChip = (v, i) => (i === viTri ? "chon-" + kieu : "");
  let day;
  if (N <= 25) day = chip(sx, lopChip);
  else {
    const g = N >> 1;
    day = chip([...sx.slice(0, 3), "…", sx[g], "…", ...sx.slice(-3)],
      (v, i) => (kieu === "min" && i === 0) || (kieu === "max" && i === 8) || (kieu === "med" && i === 4) ? "chon-" + kieu : "");
  }
  const ten = { max: "lớn nhất (phần tử cuối)", min: "nhỏ nhất (phần tử đầu)", med: `ở giữa (phần tử thứ ${viTri + 1}/${N})` }[kieu];
  el.innerHTML = `<div class="soi-hang">
    <div class="soi-luoi" style="grid-template-columns:repeat(${k},${o}px);grid-auto-rows:${o}px">${o9}</div>
    <div class="soi-chu">
      <p>Tâm cửa sổ tại điểm <b>(x = ${x}, y = ${y})</b>, giá trị hiện tại <b>${lay(r, r)}</b>${coSo ? "" : " (cửa sổ lớn nên chỉ tô màu, rê chuột lên ô để xem số)"}.</p>
      <p>Cửa sổ có <b>N = ${N}</b> điểm${N < k * k ? " – ô mờ không thuộc cửa sổ nên không được tính" : ""}. Sắp xếp tăng dần:</p>
      <p>${day}</p>
      <p>Lấy giá trị ${ten}: <b>${kq}</b> → điểm (${x}, ${y}) của ảnh mới nhận giá trị <b>${kq}</b>.${them}</p>
    </div></div>`;
  return kq;
}

// ============================== TRẠNG THÁI CHUNG ==============================
let IMG = null, TEN_ANH = "anh_mau.jpg";
const TABS = {};

// ============================== TAB 1: CỬA SỔ TRƯỢT ==============================
const MA_TRAN_SLIDE = [[12, 15, 14, 10, 11], [13, 200, 16, 12, 10], [11, 14, 15, 13, 12], [10, 12, 0, 14, 11], [12, 13, 14, 15, 13]];
TABS.t1 = (() => {
  let f = MA_TRAN_SLIDE.map((r) => r.slice()), buoc = 0, hen = null;
  const VI_TRI = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) VI_TRI.push([r, c]);
  const cua = (r, c) => { const v = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) v.push(f[r + i][c + j]); return v; };

  $("#t1GT").innerHTML = the("Đang làm gì ở bước này?", `<div id="t1B"></div>`)
    + the("Cửa sổ lọc 3×3 là gì?", `<div id="t1CS"></div>`, "xanh")
    + the("Bảng tính đủ 9 vị trí", `<p class="goi-y">Bấm vào một hàng để nhảy tới vị trí đó.</p><div id="t1Bang" class="cuon"></div>`, "rong");
  const laMuoi = (v) => v >= 200, laTieu = (v) => v === 0;
  const lopNhieu = (v) => (laMuoi(v) ? "muoi" : laTieu(v) ? "tieu" : "");
  const BUOC_CHUNG = [
    "Đặt <b>tâm</b> cửa sổ 3×3 lên điểm đang xét – bắt đầu từ góc trên trái, ở ô đầu tiên có đủ 8 điểm xung quanh.",
    "Lấy ra <b>9 giá trị</b> nằm trong cửa sổ.",
    "<b>Sắp xếp</b> 9 giá trị theo thứ tự tăng dần.",
    "Lọc cực đại lấy phần tử <b>cuối</b> (lớn nhất), lọc cực tiểu lấy phần tử <b>đầu</b> (nhỏ nhất).",
    "<b>Ghi</b> kết quả vào ô tương ứng của ảnh ra, rồi <b>trượt</b> cửa sổ sang phải 1 ô (hết hàng thì xuống hàng dưới, về đầu hàng) và lặp lại.",
  ];
  function nhanXet(w9, mx, mn, ngan = false) {
    const c200 = w9.some(laMuoi), c0 = w9.some(laTieu);
    if (ngan) return c200 && c0 ? "có cả 200 và 0: cả hai kết quả đều là nhiễu" : c200 ? "max = 200 (nhiễu lan), min xóa được 200"
      : c0 ? "min = 0 (nhiễu lan), max xóa được 0" : `vùng phẳng, max − min = ${mx - mn}`;
    if (c200 && c0) return "Cửa sổ chứa <b>cả</b> điểm muối (200) lẫn điểm tiêu (0): lọc cực đại bị 200 kéo lên, lọc cực tiểu bị 0 kéo xuống – cả hai kết quả đều là nhiễu.";
    if (c200) return "Cửa sổ chứa điểm muối 200: lọc cực đại chọn đúng 200 → nhiễu <b>lan</b> sang ô này; lọc cực tiểu bỏ qua 200 → nhiễu <b>bị xóa</b>.";
    if (c0) return "Cửa sổ chứa điểm tiêu 0: lọc cực tiểu chọn 0 → nhiễu <b>lan</b> sang ô này; lọc cực đại bỏ qua 0 → nhiễu <b>bị xóa</b>.";
    return `Cửa sổ không có điểm nhiễu: max − min = ${mx} − ${mn} = ${mx - mn}, rất nhỏ vì đây là vùng phẳng – hai phép lọc cho kết quả gần như nhau.`;
  }
  function veGiaiThich() {
    // 1) diễn giải bước hiện tại
    if (!buoc) {
      $("#t1B").innerHTML = `<p>Ở <b>mỗi</b> vị trí, thuật toán lặp lại đúng 5 việc:</p>${dsBuoc(BUOC_CHUNG)}<p class="goi-y">Bấm “Tiếp →” để chạy vị trí 1.</p>`;
    } else {
      const [r, c] = VI_TRI[buoc - 1], w9 = cua(r, c), s9 = w9.slice().sort((a, b) => a - b), mx = s9[8], mn = s9[0];
      const ke = buoc === 9 ? "Đây là vị trí cuối: cửa sổ đã đi hết ảnh, ảnh ra 3×3 hoàn tất."
        : c < 2 ? `Tiếp theo: trượt sang phải 1 ô → vị trí ${buoc + 1}.` : `Tiếp theo: hết hàng → xuống hàng dưới, về đầu hàng → vị trí ${buoc + 1}.`;
      $("#t1B").innerHTML = `<p><b>Vị trí ${buoc}/9</b></p>` + dsBuoc([
        `Đặt tâm cửa sổ tại ô <b>hàng ${r + 2}, cột ${c + 2}</b> của ảnh vào (giá trị ${f[r + 1][c + 1]}). Cửa sổ phủ hàng ${r + 1}–${r + 3}, cột ${c + 1}–${c + 3}.`,
        `Lấy 9 giá trị: ${chip(w9, lopNhieu)}`,
        `Sắp xếp tăng dần: ${chip(s9, (v, i) => (i === 0 ? "min" : i === 8 ? "max" : ""))}`,
        `Lọc cực đại lấy <b>${mx}</b> (lớn nhất), lọc cực tiểu lấy <b>${mn}</b> (nhỏ nhất).`,
        `Ghi ${mx} vào ô (hàng ${r + 1}, cột ${c + 1}) của ảnh lọc cực đại, ghi ${mn} vào cùng ô đó của ảnh lọc cực tiểu. ${ke}`,
      ]) + `<p class="nhan-xet"><b>Nhận xét:</b> ${nhanXet(w9, mx, mn)}</p>`;
    }
    // 2) cửa sổ 3×3 hiện tại, kèm độ lệch (s, t) so với tâm
    const w9 = buoc ? cua(...VI_TRI[buoc - 1]) : null, lech = ["−1", "0", "+1"];
    let o = "";
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const v = w9 ? w9[i * 3 + j] : "·";
      o += `<div class="${i === 1 && j === 1 ? "tam" : ""} ${w9 ? lopNhieu(v) : ""}"><small>(${lech[i]}, ${lech[j]})</small>${v}</div>`;
    }
    $("#t1CS").innerHTML = `<div class="cs-hang"><div class="cs3">${o}</div>
      <p class="goi-y">Số nhỏ trong ngoặc là độ lệch (s, t) của ô so với tâm: s theo hàng, t theo cột. Ô vàng là tâm.</p></div>` + dsCham([
      "Cửa sổ (còn gọi là mặt nạ hay phần tử cấu trúc) là vùng 3×3 điểm quanh điểm đang xét; ô giữa là <b>tâm</b> – điểm sẽ nhận giá trị mới.",
      `Công thức (x là hàng, y là cột):<div class="cong-thuc">g(x, y) = max { f(x + s, y + t) : s, t ∈ {−1, 0, 1} }</div>Lọc cực tiểu chỉ thay max bằng min.`,
      "Cửa sổ trượt lần lượt từng ô: trái → phải, trên → xuống.",
      "Bỏ qua biên: tâm chỉ đặt ở ô có đủ 8 điểm xung quanh, nên có (5 − 3 + 1) × (5 − 3 + 1) = 9 vị trí → ảnh ra 3×3. Muốn ảnh ra vẫn 5×5 thì phải đệm thêm viền (lặp lại điểm biên).",
      "Kết quả ghi vào một ảnh <b>mới</b>; ảnh vào f giữ nguyên, nếu không các vị trí sau sẽ dùng giá trị đã bị sửa.",
    ]);
    // 3) bảng 9 vị trí
    let bang = `<table class="bang"><tr><th>Vị trí</th><th>Tâm (hàng, cột)</th><th>9 giá trị trong cửa sổ</th><th>Lọc cực đại</th><th>Lọc cực tiểu</th><th>Nhận xét</th></tr>`;
    VI_TRI.forEach(([r, c], k) => {
      const ws = cua(r, c), mx = Math.max(...ws), mn = Math.min(...ws), da = k < buoc;
      bang += `<tr class="bam ${k === buoc - 1 ? "hien" : ""} ${da ? "" : "chua"}" data-b="${k + 1}"><td>${k + 1}</td><td>(${r + 2}, ${c + 2})</td><td>${chip(ws, lopNhieu)}</td>`
        + `<td><b>${da ? mx : "?"}</b></td><td><b>${da ? mn : "?"}</b></td><td class="trai">${da ? nhanXet(ws, mx, mn, true) : "chưa tính"}</td></tr>`;
    });
    $("#t1Bang").innerHTML = bang + "</table>";
  }
  $("#t1Bang").addEventListener("click", (e) => { const tr = e.target.closest("tr[data-b]"); if (tr) { dung(); buoc = +tr.dataset.b; ve(); } });
  function ve() { veChinh(); veGiaiThich(); }

  function veChinh() {
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
  $("#t2GT").innerHTML = the("Soi cửa sổ tại một điểm", `<p class="goi-y">Khung đỏ trên ảnh là cửa sổ đang soi. Bấm vào một điểm bất kỳ trên ảnh gốc hoặc ảnh sau lọc để soi điểm khác.</p><div id="t2Soi"></div>`, "rong")
    + the("Cửa sổ đang chọn", `<div id="t2CS"></div>`, "xanh") + the("Thuật toán chạy thế nào?", `<div id="t2TT"></div>`);
  const MO_TA_HINH = {
    "Vuông": (k) => `Gồm <b>tất cả</b> ${k}×${k} ô. Vùng sáng nở ra (max) hoặc co lại (min) đều theo mọi hướng; góc của vật thường bị vuông hóa.`,
    "Chữ thập": (k) => `Chỉ gồm <b>hàng giữa và cột giữa</b> (${2 * k - 1} ô). Chỉ lan theo 4 hướng ngang – dọc nên đường chéo và các góc ít bị biến dạng hơn.`,
    "Đĩa tròn": (k) => `Gồm các ô cách tâm không quá r = ${(k - 1) >> 1} điểm ảnh. Lan đều mọi hướng như một hình tròn nên kết quả tự nhiên nhất – hay dùng nhất trong thực tế.`,
    "Đoạn ngang": (k) => `Gồm ${k} ô trên <b>một hàng</b>. Chỉ tác động theo chiều ngang: lọc cực tiểu xóa các nét sáng <b>đứng</b> mảnh hơn ${k} điểm ảnh nhưng giữ nét nằm ngang; lọc cực đại lấp các khe tối đứng hẹp hơn ${k} điểm ảnh.`,
    "Đoạn dọc": (k) => `Gồm ${k} ô trên <b>một cột</b>. Chỉ tác động theo chiều dọc: lọc cực tiểu xóa các nét sáng <b>nằm ngang</b> mảnh hơn ${k} điểm ảnh nhưng giữ nét đứng; lọc cực đại lấp các khe tối nằm ngang hẹp hơn ${k} điểm ảnh.`,
  };
  let diem = null;
  const tuDong = new WeakMap();
  function diemNoiBat(a) {          // điểm có độ tương phản cục bộ lớn nhất ở vùng giữa: soi ở đó thấy rõ max ≠ min
    if (tuDong.has(a)) return tuDong.get(a);
    const [y0, h, x0, w] = vungGiua(a), d = a.d;
    let tot = -1, kq = [x0 + (w >> 1), y0 + (h >> 1)];
    for (let y = y0 + 12; y < y0 + h - 12; y += 2) for (let x = x0 + 12; x < x0 + w - 12; x += 2) {
      const i = y * a.w + x, g = Math.abs(d[i + 1] - d[i - 1]) + Math.abs(d[i + a.w] - d[i - a.w]);
      if (g > tot) { tot = g; kq = [x, y]; }
    }
    tuDong.set(a, kq); return kq;
  }
  function capNhat() {
    const k = +$("#t2K").value, hinh = $("#t2Hinh").value, laMax = radio("t2Kieu") === "max";
    $("#t2KV").textContent = k; veSe(hinh, k, laMax);
    const kq = laMax ? locCucDai(IMG, hinh, k) : locCucTieu(IMG, hinh, k);
    const vung = $("#t2Zoom").checked ? vungGiua(IMG) : null, m0 = trungBinh(IMG), m1 = trungBinh(kq);
    const r = (k - 1) >> 1, d0 = diem || diemNoiBat(IMG), x = kep(d0[0], r, IMG.w - 1 - r), y = kep(d0[1], r, IMG.h - 1 - r);
    k1.diem = k2.diem = { x, y, r };
    const m = matNa(hinh, k), N = demO(m), W = IMG.w, H = IMG.h;
    soiCuaSo($("#t2Soi"), IMG, x, y, m, laMax ? "max" : "min", ` Kiểm tra: ảnh sau lọc tại điểm này đúng bằng <b>${kq.d[y * W + x]}</b>.`);
    $("#t2CS").innerHTML = `<p><b>${hinh} ${kichThuocChu(hinh, k)}</b> – có N = ${N} điểm (xem hình nhỏ ở khung “Cửa sổ lọc”: ô màu được tính, ô trắng bỏ qua).</p>` + dsCham([
      MO_TA_HINH[hinh](k),
      k === 1 ? "Cửa sổ 1×1 chỉ có chính điểm đó nên ảnh không đổi."
        : laMax ? `Kích thước ${k}: vùng sáng lấn ra khoảng r = ${r} điểm ảnh mỗi phía; chi tiết <b>tối</b> nhỏ hơn cửa sổ (bề rộng dưới ${k} điểm ảnh) bị lấp mất.`
          : `Kích thước ${k}: vùng sáng co lại khoảng r = ${r} điểm ảnh mỗi phía; chi tiết <b>sáng</b> nhỏ hơn cửa sổ (bề rộng dưới ${k} điểm ảnh) bị xóa mất.`,
      "Cửa sổ càng lớn thì hiệu ứng càng mạnh, nhưng càng mất nhiều chi tiết thật của ảnh.",
    ]);
    $("#t2TT").innerHTML = dsBuoc([
      `Tạo một ảnh kết quả mới cùng kích thước ${W}×${H}.`,
      `Lần lượt đặt tâm cửa sổ lên <b>từng</b> điểm (x, y) – tổng cộng ${nghin(W * H)} điểm, quét trái → phải, trên → xuống.`,
      `Lấy ${N} giá trị điểm ảnh nằm trong các ô màu của cửa sổ.`,
      `Tìm giá trị ${laMax ? "lớn nhất" : "nhỏ nhất"} trong ${N} giá trị đó (cần ${N - 1} phép so sánh).`,
      "Ghi giá trị vừa tìm vào ảnh mới tại (x, y) – không ghi đè lên ảnh cũ.",
      "Ở biên ảnh, phần cửa sổ nằm ngoài ảnh được bỏ qua, chỉ xét các điểm có thật.",
    ]) + `<p class="goi-y">Làm thẳng như trên cần khoảng ${nghin(W * H * Math.max(0, N - 1))} phép so sánh. Bản web tách cửa sổ thành từng hàng / từng cột và dùng hàng đợi đơn điệu nên mỗi điểm chỉ tốn vài phép so sánh – kéo thanh trượt vẫn mượt.</p>`;
    veKhung(k1, IMG, `Độ sáng trung bình: ${so(m0)}`, vung);
    veKhung(k2, kq, `Độ sáng trung bình: ${so(m1)}`, vung,
      `Sau ${laMax ? "lọc cực đại" : "lọc cực tiểu"} ${kichThuocChu(hinh, k)} (${hinh.toLowerCase()})`, laMax ? MAU.cam : MAU.xanh);
    ghiChu("#t2Ghi", k === 1 ? "Cửa sổ 1×1 chỉ chứa chính điểm ảnh nên ảnh không đổi." : laMax
      ? `Lọc cực đại thay mỗi điểm bằng giá trị lớn nhất trong cửa sổ: ảnh sáng lên (${so(m0)} → ${so(m1)}), vùng sáng nở ra theo đúng hình dạng cửa sổ, chi tiết tối nhỏ biến mất.`
      : `Lọc cực tiểu thay mỗi điểm bằng giá trị nhỏ nhất trong cửa sổ: ảnh tối đi (${so(m0)} → ${so(m1)}), vùng sáng co lại, chi tiết sáng nhỏ biến mất.`);
  }
  ["#t2K", "#t2Hinh", "#t2Zoom"].forEach((s) => $(s).addEventListener("input", capNhat));
  document.querySelectorAll('input[name="t2Kieu"]').forEach((e) => e.addEventListener("change", capNhat));
  [k1, k2].forEach((kh) => chonDiem(kh, (x, y) => { diem = [x, y]; capNhat(); }));
  return { capNhat, veLai: () => veLai([k1, k2]), datLai: () => { diem = null; } };
})();

// ============================== TAB 3: KHỬ NHIỄU ==============================
TABS.t3 = (() => {
  let seed = 1;
  const p = $("#t3P"), k1 = khung(p, "Ảnh gốc", 420), k2 = khung(p, "Ảnh bị nhiễu", 420, MAU.do), k3 = khung(p, "Sau lọc", 420, MAU.xanh);
  p.querySelectorAll(".khung").forEach((e) => (e.style.width = "calc((100% - 28px) / 3)"));
  $("#t3GT").innerHTML = the("Soi cửa sổ tại một điểm nhiễu", `<p class="goi-y">App tự chọn một điểm nhiễu gần giữa ảnh (khung đỏ). Bấm vào ảnh bị nhiễu hoặc ảnh sau lọc để soi điểm khác.</p><div id="t3Soi"></div>`, "rong")
    + the("Vì sao bộ lọc này cho kết quả như vậy?", `<div id="t3VS"></div>`) + the("Kích thước cửa sổ ảnh hưởng thế nào?", `<div id="t3KT"></div>`, "xanh");
  let diem = null, khoa = "";
  function diemNhieu(goc, nh) {      // điểm nhiễu gần tâm vùng giữa nhất
    const [y0, h, x0, w] = vungGiua(goc), cy = y0 + h / 2, cx = x0 + w / 2;
    let tot = Infinity, kq = [cx | 0, cy | 0];
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      const i = y * goc.w + x, v = nh.d[i];
      if (v !== goc.d[i] && (v === 255 || v === 0)) { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < tot) { tot = d; kq = [x, y]; } }
    }
    return kq;
  }
  function viSao(loai, loc, k) {
    const N = k * k, giua = (N + 1) / 2, muoi = loai !== "Tiêu", tieu = loai !== "Muối", L = [];
    if (muoi) L.push("Điểm <b>muối</b> có giá trị 255 – lớn nhất có thể.");
    if (tieu) L.push("Điểm <b>tiêu</b> có giá trị 0 – nhỏ nhất có thể.");
    L.push(`Cửa sổ ${k}×${k} gồm điểm đang xét và ${N - 1} điểm xung quanh; ở mật độ thấp, hầu hết các điểm này là điểm bình thường.`);
    if (loc === "min") {
      if (muoi) L.push(`Lọc cực tiểu lấy giá trị <b>nhỏ nhất</b> nên 255 không bao giờ được chọn (trừ khi cả ${N} điểm đều là muối) → chấm muối <b>bị xóa</b>.`);
      if (tieu) L.push(`${muoi ? "Ngược lại, 0 luôn là giá trị nhỏ nhất" : "Lọc cực tiểu lấy giá trị <b>nhỏ nhất</b> – mà 0 luôn nhỏ nhất"}: mọi điểm có cửa sổ chạm vào chấm tiêu đều thành 0 → mỗi chấm tiêu <b>nở thành khối ${k}×${k}</b>.`);
      L.push(`Tác dụng phụ: vùng sáng của ảnh cũng co lại ${(k - 1) >> 1} điểm ảnh, ảnh tối đi một chút.`);
    } else if (loc === "max") {
      if (tieu) L.push(`Lọc cực đại lấy giá trị <b>lớn nhất</b> nên 0 không bao giờ được chọn (trừ khi cả ${N} điểm đều là tiêu) → chấm tiêu <b>bị xóa</b>.`);
      if (muoi) L.push(`${tieu ? "Ngược lại, 255 luôn là giá trị lớn nhất" : "Lọc cực đại lấy giá trị <b>lớn nhất</b> – mà 255 luôn lớn nhất"}: mọi điểm có cửa sổ chạm vào chấm muối đều thành 255 → mỗi chấm muối <b>nở thành khối ${k}×${k}</b>.`);
      L.push(`Tác dụng phụ: vùng sáng của ảnh cũng nở ra ${(k - 1) >> 1} điểm ảnh, ảnh sáng lên một chút.`);
    } else {
      L.push(`Lọc trung vị sắp xếp ${N} giá trị rồi lấy phần tử <b>ở giữa</b> (thứ ${giua}). Giá trị nhiễu 0 hay 255 luôn nằm ở hai đầu dãy nên không được chọn, miễn là số điểm nhiễu trong cửa sổ ít hơn một nửa (dưới ${giua} điểm).`);
      L.push("Tác dụng phụ: các chi tiết rất nhỏ (nhỏ hơn nửa cửa sổ) bị mờ đi.");
    }
    return dsBuoc(L);
  }
  function capNhat() {
    const loai = radio("t3Loai"), md = +$("#t3M").value, loc = radio("t3Loc"), k = +radio("t3K");
    $("#t3MV").textContent = md;
    const nh = themNhieu(IMG, loai, md, seed);
    if (khoa !== loai + md + seed) { diem = null; khoa = loai + md + seed; }    // nhiễu mới thì chọn lại điểm nhiễu
    let kq, ten, mau;
    if (loc === "min") { kq = locCucTieu(nh, "Vuông", k); ten = "lọc cực tiểu"; mau = MAU.xanh; }
    else if (loc === "max") { kq = locCucDai(nh, "Vuông", k); ten = "lọc cực đại"; mau = MAU.cam; }
    else { kq = trungVi(nh, k); ten = "lọc trung vị"; mau = MAU.xam; }
    const vung = $("#t3Zoom").checked ? vungGiua(IMG) : null;
    const r = (k - 1) >> 1, d0 = diem || diemNhieu(IMG, nh), x = kep(d0[0], r, IMG.w - 1 - r), y = kep(d0[1], r, IMG.h - 1 - r), i = y * IMG.w + x;
    k2.diem = k3.diem = { x, y, r };
    const lech = Math.abs(kq.d[i] - IMG.d[i]);
    soiCuaSo($("#t3Soi"), nh, x, y, matNa("Vuông", k), loc,
      `<br>So sánh: giá trị gốc (trước khi bị nhiễu) là <b>${IMG.d[i]}</b>, sau nhiễu là <b>${nh.d[i]}</b>, sau lọc là <b>${kq.d[i]}</b> → `
      + (lech <= 25 ? `chỉ lệch ${lech} so với gốc ✔.` : `lệch ${lech} so với gốc ✘.`));
    $("#t3VS").innerHTML = viSao(loai, loc, k);
    const N = k * k, tb = (N * md) / 100;
    $("#t3KT").innerHTML = `<p>Cửa sổ ${k}×${k} có <b>N = ${N}</b> điểm. Với mật độ nhiễu ${md} %, trung bình mỗi cửa sổ chứa khoảng <b>${so(tb, 2)}</b> điểm nhiễu.</p>` + dsCham([
      "Cửa sổ <b>nhỏ</b> (3×3): giữ chi tiết tốt nhất và đã đủ cho nhiễu xung, vì mỗi chấm nhiễu chỉ rộng 1 điểm ảnh.",
      "Cửa sổ <b>lớn</b> (5×5, 7×7): xóa được cả những cụm nhiễu dính nhau, nhưng làm mất chi tiết nhỏ (lông mày, nếp nhăn); với lọc cực đại / cực tiểu thì ảnh còn sáng lên / tối đi rõ hơn.",
      loc === "med" ? `Lọc trung vị chỉ thất bại khi cửa sổ có từ ${(N + 1) / 2} điểm nhiễu trở lên – cửa sổ càng lớn thì càng khó xảy ra.`
        : loc === "min" ? `Lọc cực tiểu chỉ để sót chấm <b>muối</b> khi cả ${N} điểm trong cửa sổ đều là muối – gần như không bao giờ xảy ra; còn mỗi chấm <b>tiêu</b> thì luôn nở thành ${N} điểm.`
          : `Lọc cực đại chỉ để sót chấm <b>tiêu</b> khi cả ${N} điểm trong cửa sổ đều là tiêu – gần như không bao giờ xảy ra; còn mỗi chấm <b>muối</b> thì luôn nở thành ${N} điểm.`,
    ]);
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
  [k2, k3].forEach((kh) => chonDiem(kh, (x, y) => { diem = [x, y]; capNhat(); }));
  return { capNhat, veLai: () => veLai([k1, k2, k3]), datLai: () => { diem = null; khoa = ""; } };
})();

// ============================== VÍ DỤ 1 CHIỀU (tab 4, 5) ==============================
const loc1D = (v, r, laMax) => v.map((_, i) => {
  let m = laMax ? -1 : 256;
  for (let j = Math.max(0, i - r); j <= Math.min(v.length - 1, i + r); j++) m = laMax ? Math.max(m, v[j]) : Math.min(m, v[j]);
  return m;
});
const trungVi1D = (v, r) => v.map((_, i) => {
  const w = []; for (let j = i - r; j <= i + r; j++) w.push(v[kep(j, 0, v.length - 1)]);
  return w.sort((a, b) => a - b)[w.length >> 1];
});
// hang: [{ ten, v, so (hàng để so ô bị đổi), nx (giải thích), xam (tô nền theo mức xám), lop, hienThi, hien }]
function bang1D(hang, nhieu = true) {
  const n = hang[0].v.length;
  let h = `<table class="bang bang1d"><tr><th class="trai">Hàng điểm ảnh</th>${Array.from({ length: n }, (_, i) => `<th>${i + 1}</th>`).join("")}<th class="trai">Giải thích</th></tr>`;
  for (const r of hang) {
    h += `<tr class="${r.hien ? "hien" : ""}"><td class="ten">${r.ten}</td>` + r.v.map((v, i) => {
      const cls = [nhieu && v === 255 ? "muoi" : nhieu && v === 0 ? "tieu" : "", r.so && r.so[i] !== v ? "doi" : "", r.lop ? r.lop(v, i) : ""].join(" ");
      const st = r.xam ? ` style="background:rgb(${v},${v},${v});color:${v > 140 ? "#1F2D37" : "#fff"}"` : "";
      return `<td class="${cls}"${st}>${r.hienThi ? r.hienThi(v) : v}</td>`;
    }).join("") + `<td class="trai nx">${r.nx || ""}</td></tr>`;
  }
  return h + "</table>";
}

// ============================== TAB 4: MỞ – ĐÓNG TỪNG BƯỚC ==============================
TABS.t4 = (() => {
  $("#t4GT").innerHTML = the("Ví dụ tính tay trên một hàng điểm ảnh",
    `<p class="goi-y">Cùng 4 bước như các ảnh ở trên nhưng làm trên 11 điểm, cửa sổ 1 chiều rộng 3 (điểm đang xét và 1 điểm mỗi bên). Ô viền cam là ô vừa bị thay đổi ở bước đó. Hàng mới hiện ra mỗi lần bấm “Bước tiếp”.</p><div id="t4VD" class="cuon"></div>`, "rong")
    + the("Các bước và ý nghĩa", `<div id="t4B"></div>`) + the("Cửa sổ 3×3 trong tab này", `<div id="t4CS"></div>`, "xanh");
  const F = [100, 100, 100, 255, 100, 100, 100, 0, 100, 100, 100];
  const H1 = loc1D(F, 1, false), H2 = loc1D(H1, 1, true), H3 = loc1D(H2, 1, true), H4 = loc1D(H3, 1, false), HTV = trungVi1D(F, 1);
  const VI_DU = [
    { ten: "Hàng gốc f", v: F, nx: "Một chấm muối (255) ở vị trí 4, một chấm tiêu (0) ở vị trí 8; còn lại đều là 100." },
    { ten: "B1 · min", v: H1, so: F, nx: "255 bị xóa (min bỏ qua giá trị lớn), nhưng 0 lan ra 3 ô (vị trí 7–9)." },
    { ten: "B2 · max = mở", v: H2, so: H1, nx: "Khối 0 co lại còn 1 ô. Min rồi max = phép mở: hết muối, còn tiêu." },
    { ten: "B3 · max", v: H3, so: H2, nx: "Chấm 0 cuối cùng bị xóa (max bỏ qua giá trị nhỏ)." },
    { ten: "B4 · min = mở rồi đóng", v: H4, so: H3, nx: "Không còn ô nào phải đổi; với ảnh thật, bước này kéo độ sáng về như cũ. Sạch cả hai loại nhiễu." },
    { ten: "Trung vị 3", v: HTV, so: F, nx: "Mỗi cửa sổ có ít nhất 2 giá trị 100 nên phần tử giữa luôn là 100 → sạch ngay sau 1 bước." },
  ];
  const Y_NGHIA = [
    "Lọc cực tiểu 3×3: xóa chấm muối (sáng), nhưng chấm tiêu (tối) lan rộng ra, ảnh tối đi.",
    "Lọc cực đại 3×3: vật trở về gần kích thước cũ. Bước 1 + 2 = <b>phép mở</b> – xóa các chi tiết sáng nhỏ hơn cửa sổ.",
    "Lọc cực đại 3×3: xóa các chấm tiêu còn lại, ảnh sáng lên.",
    "Lọc cực tiểu 3×3: độ sáng trở về như cũ. Bước 3 + 4 = <b>phép đóng</b> – lấp các chi tiết tối nhỏ hơn cửa sổ.",
    "So sánh: lọc trung vị 3×3 làm sạch trong đúng một bước.",
  ];
  $("#t4CS").innerHTML = `<p>Cả 4 bước đều dùng cửa sổ <b>vuông 3×3</b> (9 điểm).</p>` + dsCham([
    "Nhiễu muối tiêu là các điểm lẻ, rộng 1 điểm ảnh – nhỏ hơn cửa sổ 3×3 nên bị xóa.",
    "Phép mở và phép đóng chỉ xóa những gì <b>nhỏ hơn</b> cửa sổ; vật lớn hơn cửa sổ giữ nguyên kích thước – khác với chỉ lọc cực tiểu làm mọi vật co lại.",
    "Cửa sổ 5×5 vẫn xóa được nhiễu nhưng xóa luôn chi tiết thật nhỏ hơn 5 điểm ảnh (viền kính, nếp nhăn), nên ở đây chọn 3×3.",
    "Trung vị tốt hơn với nhiễu muối tiêu, nhưng max / min làm được những việc trung vị không làm được: tách biên (tab 5), tách nền (tab 6).",
  ]);
  function veGiaiThich() {
    $("#t4VD").innerHTML = bang1D(VI_DU.slice(0, buoc + 1).map((h, i) => ({ ...h, hien: i === buoc })));
    $("#t4B").innerHTML = dsBuoc(Y_NGHIA, buoc - 1)
      + `<p class="goi-y">Vì sao phải ghép 4 bước? Mỗi phép đơn lẻ chỉ xóa được một loại nhiễu và làm loại còn lại lan rộng (xem tab 3); phép sau sửa lại tác dụng phụ của phép trước. PSNR (dB) đo độ giống ảnh gốc: càng cao càng giống.</p>`;
  }
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
    veGiaiThich();
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
  $("#t5GT").innerHTML = the("Ví dụ tính tay trên một hàng điểm ảnh",
    `<p class="goi-y">Hàng 20 điểm có 3 chỗ đổi độ sáng: 40 → 190 (chênh 150), 190 → 120 (chênh 70) và 120 → 140 (chênh 20). Cửa sổ 1 chiều cùng độ rộng k với thanh trượt; màu nền mỗi ô là mức xám của nó.</p><div id="t5VD" class="cuon"></div><div id="t5KL"></div>`, "rong")
    + the("Các bước", `<div id="t5B"></div>`) + the("Cửa sổ ảnh hưởng thế nào?", `<div id="t5CS"></div>`, "xanh");
  const F = [40, 40, 40, 40, 40, 190, 190, 190, 190, 190, 190, 120, 120, 120, 120, 120, 140, 140, 140, 140];
  const BIEN = [[5, 150, "40 → 190"], [11, 70, "190 → 120"], [16, 20, "120 → 140"]];      // [vị trí bắt đầu vùng mới, độ chênh, nhãn]
  const BIEN_THEO_HINH = {
    "Vuông": "bắt biên theo mọi hướng.",
    "Chữ thập": "bắt tốt biên ngang và dọc, biên chéo yếu hơn một chút.",
    "Đĩa tròn": "bắt biên đều mọi hướng, viền ở các góc mịn và tròn hơn.",
    "Đoạn ngang": "chỉ so sánh theo chiều ngang → chỉ bắt được biên <b>đứng</b> (độ sáng đổi khi đi ngang); biên nằm ngang gần như biến mất.",
    "Đoạn dọc": "chỉ so sánh theo chiều dọc → chỉ bắt được biên <b>nằm ngang</b>; biên đứng gần như biến mất.",
  };
  function veGiaiThich(k, hinh, ng) {
    const r = (k - 1) >> 1, mx = loc1D(F, r, true), mn = loc1D(F, r, false), g = mx.map((v, i) => v - mn[i]);
    $("#t5VD").innerHTML = bang1D([
      { ten: "Hàng gốc f", v: F, xam: true, nx: "" },
      { ten: `max (k = ${k})`, v: mx, so: F, xam: true, nx: "Vùng sáng lấn sang vùng tối" },
      { ten: `min (k = ${k})`, v: mn, so: F, xam: true, nx: "Vùng tối lấn sang vùng sáng" },
      { ten: "max − min", v: g, xam: true, nx: "≈ 0 ở vùng phẳng, lớn ở biên" },
      { ten: `> ngưỡng ${ng}?`, v: g, lop: (v) => (v > ng ? "bien" : "khong"), hienThi: (v) => (v > ng ? "✓" : "·"), nx: "✓ = điểm biên" },
    ], false);
    const coBien = ([b]) => g[b] > ng || g[b - 1] > ng;                     // đọc đúng theo bảng ở trên
    const giu = BIEN.filter(coBien).map((b) => b[2]), bo = BIEN.filter((b) => !coBien(b)).map((b) => b[2]);
    $("#t5KL").innerHTML = `<p class="nhan-xet"><b>Nhận xét:</b> mỗi chỗ đổi độ sáng tạo ra một vệt max − min dày khoảng k − 1 = ${k - 1} điểm`
      + `${k >= 7 ? " (cửa sổ lớn nên các vệt gần nhau bắt đầu dính vào nhau)" : ""}. Với ngưỡng ${ng}: `
      + `${giu.length ? `giữ lại biên ${giu.join(", ")}` : "không giữ được biên nào"}${bo.length ? `; biên yếu ${bo.join(", ")} bị loại` : ""}.</p>`;
    $("#t5B").innerHTML = dsBuoc([
      `Lọc cực đại ${kichThuocChu(hinh, k)}: mỗi điểm lấy giá trị sáng nhất xung quanh → vùng sáng lấn sang vùng tối ${r} điểm ảnh.`,
      `Lọc cực tiểu ${kichThuocChu(hinh, k)}: mỗi điểm lấy giá trị tối nhất → vùng tối lấn sang vùng sáng ${r} điểm ảnh.`,
      "Trừ hai ảnh: gradient = max − min. Ở vùng phẳng mọi điểm trong cửa sổ gần bằng nhau → max ≈ min → gần 0 (đen). Ở biên, cửa sổ chứa cả phần sáng lẫn phần tối → hiệu lớn → sáng.",
      `So với ngưỡng: điểm có max − min > ${ng} là điểm biên (trắng), còn lại là nền (đen).`,
    ]) + `<div class="cong-thuc">g(x, y) = max<sub>W</sub> f − min<sub>W</sub> f ≥ 0</div>`;
    $("#t5CS").innerHTML = dsCham([
      `Độ dày viền ≈ k − 1 = ${k - 1} điểm ảnh (r = ${r} điểm mỗi bên biên). Cửa sổ càng lớn viền càng dày, nhưng các biên gần nhau dễ dính vào nhau.`,
      `Hình dạng <b>${hinh.toLowerCase()}</b>: ${BIEN_THEO_HINH[hinh]}`,
      "Ngưỡng cao → chỉ giữ biên mạnh (đường viền chính); ngưỡng thấp → giữ cả biên yếu (vân, nếp nhăn, nhiễu).",
      "Ưu điểm: chỉ cần phép so sánh, không cần nhân chập; viền luôn khép kín quanh vật.",
    ]);
  }
  function capNhat() {
    const k = +$("#t5K").value, hinh = $("#t5Hinh").value, ng = +$("#t5N").value;
    $("#t5KV").textContent = k; $("#t5NV").textContent = ng;
    const mx = locCucDai(IMG, hinh, k), mn = locCucTieu(IMG, hinh, k), gr = tru(mx, mn), np = nhiPhan(gr, ng);
    const tl = tiLeTrang(np), vung = $("#t5Zoom").checked ? vungGiua(IMG) : null;
    veGiaiThich(k, hinh, ng);
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
  const BD = { goc: "#A9B4BA", nen: "#2A7F93", th: "#C2571A", luoi: "#E6EBED", chu: "#5B6B73", nguong1: "#7D8A91" };
  $("#t6GT").innerHTML = the("Lát cắt một hàng của ảnh chữ",
    `<p class="goi-y">Biểu đồ vẽ độ sáng dọc theo hàng có vạch đỏ đứt trên ảnh đầu tiên. Rê chuột lên biểu đồ để xem giá trị từng điểm.</p>
     <div class="chu-giai">
       <span><i style="background:${BD.goc}"></i>Ảnh gốc</span><span><i style="background:${BD.nen}"></i>Nền ước lượng (phép mở)</span>
       <span><i style="background:${BD.th}"></i>Top-hat = gốc − nền</span>
       <span><i class="manh" style="background:${BD.nguong1}"></i>Ngưỡng Otsu trên ảnh gốc</span><span><i class="manh" style="background:${BD.th}"></i>Ngưỡng Otsu trên top-hat</span>
     </div>
     <div class="bieu-do-boc"><canvas class="bieu-do" id="t6BD"></canvas><div class="tip" id="t6Tip"></div></div>`, "rong")
    + the("Các bước", `<div id="t6B"></div>`) + the("Chọn kích thước cửa sổ", `<div id="t6CS"></div>`, "xanh");

  // Mặt nạ nét chữ thật (ảnh chữ không có nền lệch) – dùng để đo nét chữ và chấm điểm kết quả
  let MAT = null, NET = 10, HANG = 70;
  function chuanBi() {
    if (MAT) return;
    MAT = nhiPhan(anhChu(0), 140);
    const dem = new Map(); let nhieuNhat = -1;
    for (let y = 0; y < 125; y++) {                       // dòng chữ thứ nhất
      let soDoan = 0, chay = 0;
      for (let x = 0; x <= MAT.w; x++) {
        const on = x < MAT.w && MAT.d[y * MAT.w + x] > 0;
        if (on) chay++;
        else if (chay) { dem.set(chay, (dem.get(chay) || 0) + 1); soDoan++; chay = 0; }
      }
      if (soDoan > nhieuNhat) { nhieuNhat = soDoan; HANG = y; }   // hàng cắt qua nhiều nét đứng nhất
    }
    NET = [...dem.entries()].sort((p, q) => q[1] - p[1])[0][0];  // độ dài đoạn hay gặp nhất = bề dày nét
  }
  function cham(b) {                  // [giữ được bao nhiêu % nét chữ, nhận nhầm bao nhiêu % nền]
    let chu = 0, giu = 0, nen = 0, nham = 0;
    for (let i = 0; i < b.d.length; i++) { if (MAT.d[i]) { chu++; if (b.d[i]) giu++; } else { nen++; if (b.d[i]) nham++; } }
    return [giu / chu * 100, nham / nen * 100];
  }

  let duLieu = null;
  function veBieuDo(xHover = null) {
    const cv = $("#t6BD"), tip = $("#t6Tip");
    if (!duLieu || !cv.clientWidth) return;
    const { goc, nen, th, T1, T2 } = duLieu, n = goc.length;
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = 250, L = 34, R = 12, T = 10, B = 24;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + "px";
    const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    const X = (i) => L + (i / (n - 1)) * (W - L - R), Y = (v) => T + (1 - v / 255) * (H - T - B);
    c.font = "11px Segoe UI, Arial"; c.fillStyle = BD.chu; c.lineWidth = 1;
    c.textAlign = "right"; c.textBaseline = "middle";
    for (const v of [0, 50, 100, 150, 200, 250]) {
      c.strokeStyle = BD.luoi; c.beginPath(); c.moveTo(L, Y(v) + 0.5); c.lineTo(W - R, Y(v) + 0.5); c.stroke();
      c.fillText(v, L - 6, Y(v));
    }
    c.textAlign = "center"; c.textBaseline = "top";
    for (let x = 0; x < n; x += 100) c.fillText(x, X(x), H - B + 6);
    // ảnh gốc: vùng tô nhạt + đường
    c.beginPath(); c.moveTo(X(0), Y(0)); goc.forEach((v, i) => c.lineTo(X(i), Y(v))); c.lineTo(X(n - 1), Y(0)); c.closePath();
    c.fillStyle = "rgba(169,180,186,0.16)"; c.fill();
    c.lineJoin = c.lineCap = "round";
    for (const [arr, mau] of [[goc, BD.goc], [nen, BD.nen], [th, BD.th]]) {
      c.strokeStyle = mau; c.lineWidth = 2; c.beginPath(); arr.forEach((v, i) => (i ? c.lineTo(X(i), Y(v)) : c.moveTo(X(i), Y(v)))); c.stroke();
    }
    // hai ngưỡng Otsu
    c.textAlign = "right"; c.textBaseline = "bottom"; c.lineWidth = 1;
    for (const [v, mau, nhan] of [[T1, BD.nguong1, `ngưỡng Otsu ảnh gốc = ${T1}`], [T2, BD.th, `ngưỡng Otsu top-hat = ${T2}`]]) {
      c.strokeStyle = mau; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(L, Y(v) + 0.5); c.lineTo(W - R, Y(v) + 0.5); c.stroke(); c.setLineDash([]);
      c.fillStyle = BD.chu; c.fillText(nhan, W - R - 4, Y(v) - 2);
    }
    if (xHover === null) { tip.style.display = "none"; return; }
    const i = kep(Math.round(((xHover - L) / (W - L - R)) * (n - 1)), 0, n - 1), px = X(i);
    c.strokeStyle = "#1F2D37"; c.lineWidth = 1; c.beginPath(); c.moveTo(px + 0.5, T); c.lineTo(px + 0.5, H - B); c.stroke();
    for (const [arr, mau] of [[goc, BD.goc], [nen, BD.nen], [th, BD.th]]) {
      c.beginPath(); c.arc(px, Y(arr[i]), 4, 0, 2 * Math.PI); c.fillStyle = mau; c.fill(); c.lineWidth = 2; c.strokeStyle = "#fff"; c.stroke();
    }
    tip.innerHTML = `<b>x = ${i}</b><br><i style="background:${BD.goc}"></i>Ảnh gốc: ${goc[i]}<br><i style="background:${BD.nen}"></i>Nền ước lượng: ${nen[i]}<br><i style="background:${BD.th}"></i>Top-hat: ${th[i]}`;
    tip.style.display = "block";
    tip.style.left = (px + 14 + 170 > W ? px - 14 - tip.offsetWidth : px + 14) + "px";
    tip.style.top = "14px";
  }
  $("#t6BD").addEventListener("mousemove", (e) => veBieuDo(e.clientX - $("#t6BD").getBoundingClientRect().left));
  $("#t6BD").addEventListener("mouseleave", () => veBieuDo(null));

  function capNhat() {
    chuanBi();
    const nen = +$("#t6N").value, k = +$("#t6K").value;
    $("#t6NV").textContent = nen; $("#t6KV").textContent = k;
    const a = anhChu(nen);
    const mo = locCucDai(locCucTieu(a, "Đĩa tròn", k), "Đĩa tròn", k);      // phép mở: min rồi max
    const T1 = nguongOtsu(a), th = tru(a, mo), T2 = nguongOtsu(th), b1 = nhiPhan(a, T1), b2 = nhiPhan(th, T2);
    const p1 = tiLeTrang(b1), p2 = tiLeTrang(b2), [g1, n1] = cham(b1), [g2, n2] = cham(b2), nho = g2 < 90;
    ks[0].hang = HANG;
    veKhung(ks[0], a); veKhung(ks[1], b1, `${so(p1, 2)} % điểm trắng`); veKhung(ks[2], th); veKhung(ks[3], b2, `${so(p2, 2)} % điểm trắng`);
    ghiChu("#t6Ghi", nho ? "Cửa sổ quá nhỏ (chưa lớn hơn hẳn nét chữ): phép mở không xóa được chữ, nên “nền ước lượng” còn dính cả chữ; lấy ảnh gốc trừ đi thì nét chữ bị trừ mất theo. Hãy tăng kích thước lên."
      : `Nhị phân trực tiếp: ${so(p1, 2)} % điểm trắng${n1 > 1 ? " (dính cả mảng nền sáng)" : ""}. Sau top-hat: ${so(p2, 2)} % – chỉ còn đúng nét chữ.`
        + (n1 > 1 ? "" : "\nNền gần như đều nên nhị phân trực tiếp cũng đã ổn – hãy tăng độ không đều của nền để thấy khác biệt."), nho);
    const hang = (img) => Array.from(img.d.subarray(HANG * img.w, (HANG + 1) * img.w));
    duLieu = { goc: hang(a), nen: hang(mo), th: hang(th), T1, T2 };
    veBieuDo();
    $("#t6B").innerHTML = dsBuoc([
      `Phép mở = lọc cực tiểu rồi lọc cực đại, dùng cửa sổ <b>đĩa tròn ${k}×${k}</b>.`,
      `Lọc cực tiểu: nét chữ sáng (dày khoảng ${NET} điểm ảnh) ${!nho ? "mảnh hơn cửa sổ nên bị phần nền tối xung quanh “nuốt” mất – chỉ còn lại nền" : "chưa mảnh hơn hẳn cửa sổ nên <b>không</b> bị xóa hết"}.`,
      "Lọc cực đại: phần còn lại nở về gần như cũ → ảnh <b>nền ước lượng</b> (đường xanh trên biểu đồ).",
      "Top-hat = ảnh gốc − nền ước lượng: nền (kể cả mảng sáng) về gần 0, chỉ còn nét chữ (đường cam).",
      `Otsu tự chọn ngưỡng tách chữ / nền. Trên ảnh gốc ngưỡng là ${T1}: ${n1 > 1 ? "phần nền sáng vượt ngưỡng nên bị dính vào chữ" : "nền đều nên ngưỡng này vẫn tách được"}. Trên ảnh top-hat ngưỡng là ${T2}: ${nho ? "nhưng chữ đã bị trừ mất nhiều" : "tách sạch"}.`,
    ]);
    $("#t6CS").innerHTML = `<p>Nét chữ trong ảnh dày khoảng <b>${NET} điểm ảnh</b>; cửa sổ đang dùng là <b>${k}×${k}</b> → ${nho ? "<b>chưa đủ lớn</b> ✘ (cần lớn hơn hẳn nét chữ – hãy kéo thanh trượt lên)" : "lớn hơn nét chữ ✔"}.</p>`
      + `<table class="bang"><tr><th></th><th>Giữ được nét chữ</th><th>Nhận nhầm nền thành chữ</th></tr>`
      + `<tr><td class="ten">Nhị phân trực tiếp</td><td>${so(g1, 1)} %</td><td>${so(n1, 1)} %</td></tr>`
      + `<tr><td class="ten">Top-hat rồi nhị phân</td><td>${so(g2, 1)} %</td><td>${so(n2, 1)} %</td></tr></table>` + dsCham([
      "Quy tắc chọn: cửa sổ phải <b>lớn hơn nét chữ</b> để phép mở xóa được chữ, nhưng nhỏ hơn nhiều so với mảng sáng của nền (nền thay đổi chậm nên phép mở vẫn ôm theo được).",
      "Dùng đĩa tròn để nền ước lượng tròn trịa, không bị góc cạnh như cửa sổ vuông.",
      "Cửa sổ quá lớn thì tính lâu hơn và nền ước lượng bám kém hơn ở chỗ nền đổi nhanh.",
    ]);
  }
  ["#t6N", "#t6K"].forEach((s) => $(s).addEventListener("input", capNhat));
  return { capNhat, veLai: () => { veLai(ks); veBieuDo(); } };
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
  Object.values(TABS).forEach((t) => t.datLai && t.datLai());     // ảnh mới: bỏ điểm soi cũ
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
