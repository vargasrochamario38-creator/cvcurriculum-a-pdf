const $ = (id) => document.getElementById(id);

const campos = [
  "nombre", "cargo", "correo", "telefono", "ubicacion",
  "linkedin", "perfil", "experiencia", "educacion", "habilidades", "extras"
];

function texto(id, fallback) {
  return $(id).value.trim() || fallback;
}

function actualizarCV() {
  $("pNombre").textContent = texto("nombre", "Tu Nombre Completo");
  $("pCargo").textContent = texto("cargo", "Profesión o cargo deseado");
  $("pCorreo").textContent = texto("correo", "correo@ejemplo.com");
  $("pTelefono").textContent = texto("telefono", "Teléfono");
  $("pUbicacion").textContent = texto("ubicacion", "Ciudad / País");
  $("pLinkedin").textContent = texto("linkedin", "LinkedIn / Portafolio");
  $("pPerfil").textContent = texto("perfil", "Aquí aparecerá tu resumen profesional.");
  $("pExperiencia").textContent = texto("experiencia", "Agrega tu experiencia laboral principal.");
  $("pEducacion").textContent = texto("educacion", "Agrega tus estudios principales.");
  $("pExtras").textContent = texto("extras", "Agrega idiomas o certificaciones.");

  const habilidades = texto("habilidades", "Responsabilidad, comunicación, trabajo en equipo")
    .split(",")
    .map(h => h.trim())
    .filter(Boolean);

  $("pHabilidades").innerHTML = "";
  habilidades.forEach(h => {
    const li = document.createElement("li");
    li.textContent = h;
    $("pHabilidades").appendChild(li);
  });
}

campos.forEach(id => {
  $(id).addEventListener("input", actualizarCV);
});

$("btnActualizar").addEventListener("click", actualizarCV);

/* ================================
   RECORTE CIRCULAR DE LA FOTOGRAFÍA
=================================== */

const cropModal = $("cropModal");
const cropCanvas = $("cropCanvas");
const ctx = cropCanvas.getContext("2d");
const zoomRange = $("zoomRange");

let cropImg = new Image();
let scale = 1;
let posX = 0;
let posY = 0;
let isDragging = false;
let startX = 0;
let startY = 0;

function abrirRecorte(src) {
  cropImg = new Image();
  cropImg.onload = () => {
    scale = Math.max(cropCanvas.width / cropImg.width, cropCanvas.height / cropImg.height);
    zoomRange.value = 1;
    posX = (cropCanvas.width - cropImg.width * scale) / 2;
    posY = (cropCanvas.height - cropImg.height * scale) / 2;
    cropModal.classList.remove("hidden");
    dibujarCrop();
  };
  cropImg.src = src;
}

function dibujarCrop() {
  ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  ctx.drawImage(cropImg, posX, posY, cropImg.width * scale, cropImg.height * scale);
}

$("foto").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    abrirRecorte(e.target.result);
  };
  reader.readAsDataURL(file);
});

zoomRange.addEventListener("input", () => {
  const baseScale = Math.max(cropCanvas.width / cropImg.width, cropCanvas.height / cropImg.height);
  const previousScale = scale;
  scale = baseScale * parseFloat(zoomRange.value);

  const centerX = cropCanvas.width / 2;
  const centerY = cropCanvas.height / 2;

  posX = centerX - (centerX - posX) * (scale / previousScale);
  posY = centerY - (centerY - posY) * (scale / previousScale);

  dibujarCrop();
});

function getPointer(e) {
  const rect = cropCanvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  return {
    x: (touch.clientX - rect.left) * (cropCanvas.width / rect.width),
    y: (touch.clientY - rect.top) * (cropCanvas.height / rect.height)
  };
}

function iniciarArrastre(e) {
  e.preventDefault();
  isDragging = true;
  const p = getPointer(e);
  startX = p.x - posX;
  startY = p.y - posY;
}

function moverArrastre(e) {
  if (!isDragging) return;
  e.preventDefault();
  const p = getPointer(e);
  posX = p.x - startX;
  posY = p.y - startY;
  dibujarCrop();
}

function terminarArrastre() {
  isDragging = false;
}

cropCanvas.addEventListener("mousedown", iniciarArrastre);
cropCanvas.addEventListener("mousemove", moverArrastre);
window.addEventListener("mouseup", terminarArrastre);

cropCanvas.addEventListener("touchstart", iniciarArrastre, { passive: false });
cropCanvas.addEventListener("touchmove", moverArrastre, { passive: false });
window.addEventListener("touchend", terminarArrastre);

$("cancelCrop").addEventListener("click", () => {
  cropModal.classList.add("hidden");
  $("foto").value = "";
});

$("applyCrop").addEventListener("click", () => {
  const output = document.createElement("canvas");
  output.width = 500;
  output.height = 500;
  const octx = output.getContext("2d");

  octx.clearRect(0, 0, output.width, output.height);
  octx.save();
  octx.beginPath();
  octx.arc(250, 250, 250, 0, Math.PI * 2);
  octx.closePath();
  octx.clip();

  const circleSize = 260;
  const sourceX = (cropCanvas.width - circleSize) / 2;
  const sourceY = (cropCanvas.height - circleSize) / 2;

  octx.drawImage(
    cropCanvas,
    sourceX, sourceY, circleSize, circleSize,
    0, 0, output.width, output.height
  );

  octx.restore();

  const croppedImage = output.toDataURL("image/png");
  $("previewFoto").src = croppedImage;
  $("previewFoto").classList.remove("hidden");
  $("placeholderFoto").classList.add("hidden");
  cropModal.classList.add("hidden");
});

/* ================================
   DESCARGA PDF TAMAÑO CARTA
=================================== */

$("btnPDF").addEventListener("click", async () => {
  const form = $("cvForm");
  const mensaje = $("mensaje");

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  if (!window.html2canvas || !window.jspdf) {
    mensaje.textContent = "No cargaron las librerías del PDF. Revisa tu conexión a internet y vuelve a intentar.";
    return;
  }

  actualizarCV();

  const boton = $("btnPDF");
  boton.disabled = true;
  boton.textContent = "Generando PDF...";
  mensaje.textContent = "Preparando archivo PDF...";

  try {
    const cv = $("cvPreview");
    const originalTransform = cv.style.transform;
    cv.style.transform = "scale(1)";

    await new Promise(resolve => setTimeout(resolve, 200));

    const canvas = await html2canvas(cv, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: cv.scrollWidth,
      windowHeight: cv.scrollHeight
    });

    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;

    // Carta normal: 8.5 x 11 pulgadas = 215.9 x 279.4 mm
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "letter"
    });

    pdf.addImage(imgData, "PNG", 0, 0, 215.9, 279.4);

    const nombreArchivo = texto("nombre", "curriculum")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/gi, "");

    pdf.save(`${nombreArchivo}-cv-carta.pdf`);

    cv.style.transform = originalTransform;
    mensaje.textContent = "PDF descargado correctamente.";
  } catch (error) {
    console.error(error);
    mensaje.textContent = "No se pudo generar el PDF. Prueba abrir la página desde GitHub Pages o con Live Server.";
  } finally {
    boton.disabled = false;
    boton.textContent = "Descargar PDF";
  }
});

actualizarCV();
