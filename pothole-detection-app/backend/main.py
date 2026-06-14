from __future__ import annotations

from __future__ import annotations

import os
import threading
import uuid

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse, Response

from backend.schemas import (
    DetectionOut,
    PredictResponse,
    TrainRequest,
    TrainStartResponse,
    TrainStatusResponse,
)
from pothole.inference import draw_detections, load_image_bytes, predict_from_pil
from pothole.heuristic import heuristic_detect_potholes

app = FastAPI(title="Pothole Detection API", version="0.1.0")

_ENABLE_TRAINING = os.getenv("ENABLE_TRAINING_API", "0").strip() == "1"

_train_jobs: dict[str, dict[str, str | None]] = {}
_train_lock = threading.Lock()

_DEMO_HTML = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Pothole Detector (Mobile Demo)</title>
    <style>
      :root { color-scheme: dark; }
      body {
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        margin: 0;
        background: radial-gradient(1200px 600px at 50% 0%, #1a2b6b 0%, #0b1220 55%, #050812 100%);
        color: #e9eefb;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .phone {
        width: min(393px, 100%);
        height: min(851px, 92vh);
        border-radius: 44px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,.16);
        box-shadow: 0 30px 90px rgba(0,0,0,.55);
        background: rgba(11,18,32,.9);
        display: flex;
        flex-direction: column;
      }
      header { padding: 16px 14px 14px; border-bottom: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.05); }
      header h1 { margin: 0; font-size: 18px; }
      header p { margin: 6px 0 0; opacity: .8; font-size: 13px; }
      main { max-width: none; margin: 0; padding: 14px 12px 18px; overflow: auto; flex: 1; }
      .card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 14px; padding: 14px; }
      .row { display: grid; grid-template-columns: 1fr; gap: 14px; }
      @media (min-width: 900px) { .row { grid-template-columns: 1fr; } }
      .controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
      input[type=file] { padding: 8px; background: rgba(255,255,255,.06); border-radius: 10px; border: 1px solid rgba(255,255,255,.10); color: #e9eefb; }
      button { padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,.14); background: #2b6cff; color: white; font-weight: 600; cursor: pointer; }
      button:disabled { opacity: .5; cursor: not-allowed; }
      .muted { opacity: .75; font-size: 13px; }
      .pill { display: inline-flex; gap: 8px; align-items: center; padding: 8px 10px; border-radius: 999px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.10); font-size: 13px; }
      .grid { display: grid; gap: 12px; }
      img { max-width: 100%; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); }
      pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12px; background: rgba(0,0,0,.25); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,.10); }
      .err { color: #ffb4b4; }
      .tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 12px; border-bottom: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.03); }
      .tab { padding: 10px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.06); color: #e9eefb; font-weight: 700; cursor: pointer; }
      .tab.active { background: #2b6cff; border-color: rgba(255,255,255,.20); }
      .section { display: none; }
      .section.active { display: grid; gap: 12px; }
      .field { display: grid; gap: 6px; }
      .field label { font-size: 12px; opacity: .85; }
      .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      input[type=range] { width: 100%; }
      input[type=text], input[type=number], select {
        width: 100%;
        padding: 10px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.06);
        color: #e9eefb;
      }
      .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
      .metric { border-radius: 14px; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.04); padding: 10px; }
      .metric b { display: block; font-size: 18px; margin-top: 2px; }
      .metric span { font-size: 11px; opacity: .75; }
      .list { display: grid; gap: 10px; }
      .det { display: grid; gap: 6px; border-radius: 14px; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.03); padding: 10px; }
      .det .top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
      .badge { padding: 4px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; border: 1px solid rgba(255,255,255,.14); }
      .sev-severe { background: rgba(211,47,47,.18); color: #ffb4b4; }
      .sev-neutral { background: rgba(245,124,0,.18); color: #ffd6a2; }
      .sev-not { background: rgba(56,142,60,.18); color: #b9f6c3; }
    </style>
  </head>
  <body>
    <div class="phone">
    <header>
      <h1>Pothole Guard</h1>
      <p>Mobile-style demo (Pixel 5). Upload an image -> see severity, detections, and annotated preview.</p>
    </header>
    <div class="tabs">
      <button class="tab active" id="tabPredict" type="button">Predict</button>
      <button class="tab" id="tabTrain" type="button">Train</button>
    </div>
    <main class="grid">
      <section id="secPredict" class="section active">
      <div class="card">
        <div class="controls">
          <input id="file" type="file" accept="image/*" capture="environment" />
          <button id="run" disabled>Run Detection</button>
          <span class="pill" id="status">Status: idle</span>
        </div>
        <div class="row2" style="margin-top:12px">
          <div class="field">
            <label for="conf">Confidence: <span id="confVal">0.25</span></label>
            <input id="conf" type="range" min="0.05" max="0.95" step="0.05" value="0.25" />
          </div>
          <div class="field">
            <label for="iou">IoU: <span id="iouVal">0.45</span></label>
            <input id="iou" type="range" min="0.10" max="0.90" step="0.05" value="0.45" />
          </div>
        </div>
        <p class="muted">Make sure the server is reachable from your browser. For emulator/phone demos, keep using the Android app.</p>
      </div>

      <div class="row">
        <div class="card grid">
          <strong>Input</strong>
          <img id="inputImg" alt="Input preview" />
        </div>
        <div class="card grid">
          <strong>Annotated</strong>
          <img id="annotImg" alt="Annotated result" />
        </div>
      </div>

      <div class="card grid">
        <strong>Summary</strong>
        <div class="summary">
          <div class="metric"><span>Total</span><b id="mTotal">0</b></div>
          <div class="metric"><span>Severe</span><b id="mSevere">0</b></div>
          <div class="metric"><span>Risk</span><b id="mRisk">LOW</b></div>
        </div>
      </div>

      <div class="card grid">
        <strong>Detections</strong>
        <div id="detList" class="list"></div>
      </div>

      <div class="card grid">
        <strong>Raw JSON</strong>
        <div id="error" class="err"></div>
        <pre id="json">{}</pre>
      </div>

      <div class="card muted">
        API endpoints: <code>/predict/image</code>, <code>/predict/image/annotated</code>, <code>/health</code>
      </div>
      </section>

      <section id="secTrain" class="section">
        <div class="card grid">
          <strong>Training (server-side)</strong>
          <div class="muted">Training API is disabled by default. Enable by setting <code>ENABLE_TRAINING_API=1</code> on the server.</div>
          <div class="field">
            <label for="dataYaml">Data YAML path (on server)</label>
            <input id="dataYaml" type="text" value="data/pothole.yaml" />
          </div>
          <div class="row2">
            <div class="field">
              <label for="baseModel">Base model</label>
              <input id="baseModel" type="text" value="yolov8n.pt" />
            </div>
            <div class="field">
              <label for="device">Device</label>
              <input id="device" type="text" value="cpu" />
            </div>
          </div>
          <div class="row2">
            <div class="field">
              <label for="epochs">Epochs</label>
              <input id="epochs" type="number" min="1" max="1000" value="50" />
            </div>
            <div class="field">
              <label for="imgsz">Image size</label>
              <input id="imgsz" type="number" min="128" max="2048" value="640" />
            </div>
          </div>
          <div class="row2">
            <div class="field">
              <label for="batch">Batch</label>
              <input id="batch" type="number" min="1" max="256" value="16" />
            </div>
            <div class="field">
              <label>&nbsp;</label>
              <button id="startTrain" type="button">Start Training</button>
            </div>
          </div>
        </div>

        <div class="card grid">
          <strong>Training Status</strong>
          <div class="pill" id="trainStatus">Status: idle</div>
          <div class="muted" id="trainMsg"></div>
        </div>
      </section>
    </main>
    </div>

    <script>
      const $ = (id) => document.getElementById(id);
      const tabPredict = $("tabPredict");
      const tabTrain = $("tabTrain");
      const secPredict = $("secPredict");
      const secTrain = $("secTrain");

      const fileEl = $("file");
      const runEl = $("run");
      const statusEl = $("status");
      const jsonEl = $("json");
      const errEl = $("error");
      const inputImg = $("inputImg");
      const annotImg = $("annotImg");
      const confEl = $("conf");
      const iouEl = $("iou");
      const confVal = $("confVal");
      const iouVal = $("iouVal");
      const detList = $("detList");
      const mTotal = $("mTotal");
      const mSevere = $("mSevere");
      const mRisk = $("mRisk");

      const startTrain = $("startTrain");
      const dataYaml = $("dataYaml");
      const baseModel = $("baseModel");
      const device = $("device");
      const epochs = $("epochs");
      const imgsz = $("imgsz");
      const batch = $("batch");
      const trainStatus = $("trainStatus");
      const trainMsg = $("trainMsg");
      let trainJobId = null;
      let trainPoll = null;

      const setStatus = (s) => statusEl.textContent = "Status: " + s;
      const setError = (s) => errEl.textContent = s || "";

      const setTrainStatus = (s) => trainStatus.textContent = "Status: " + s;

      const setTab = (name) => {
        const predict = name === "predict";
        tabPredict.classList.toggle("active", predict);
        tabTrain.classList.toggle("active", !predict);
        secPredict.classList.toggle("active", predict);
        secTrain.classList.toggle("active", !predict);
      };

      tabPredict.addEventListener("click", () => setTab("predict"));
      tabTrain.addEventListener("click", () => setTab("train"));

      const sevClass = (s) => {
        const v = String(s || "").toLowerCase();
        if (v === "severe") return "sev-severe";
        if (v === "neutral") return "sev-neutral";
        return "sev-not";
      };

      const computeRisk = (detections) => {
        const severe = detections.filter(d => String(d.severity || "").toLowerCase() === "severe").length;
        if (severe >= 2) return "HIGH";
        if (severe === 1 || detections.length >= 3) return "MED";
        return "LOW";
      };

      const renderDetections = (detections) => {
        detList.innerHTML = "";
        const total = detections.length;
        const severe = detections.filter(d => String(d.severity || "").toLowerCase() === "severe").length;
        mTotal.textContent = String(total);
        mSevere.textContent = String(severe);
        mRisk.textContent = computeRisk(detections);

        if (!detections.length) {
          detList.innerHTML = '<div class="muted">No potholes detected (or class name mismatch).</div>';
          return;
        }

        for (const d of detections) {
          const div = document.createElement("div");
          div.className = "det";
          const sev = d.severity || "Neutral";
          const conf = typeof d.confidence === "number" ? d.confidence : Number(d.confidence || 0);
          div.innerHTML = `
            <div class="top">
              <div><b>${(d.class_name || "pothole").toString()}</b> <span class="muted">conf ${(conf*100).toFixed(0)}%</span></div>
              <span class="badge ${sevClass(sev)}">${String(sev).toUpperCase()}</span>
            </div>
            <div class="muted">Box: (${Number(d.x1).toFixed(0)}, ${Number(d.y1).toFixed(0)}) -> (${Number(d.x2).toFixed(0)}, ${Number(d.y2).toFixed(0)})</div>
          `;
          detList.appendChild(div);
        }
      };

      const syncSliders = () => {
        confVal.textContent = Number(confEl.value).toFixed(2);
        iouVal.textContent = Number(iouEl.value).toFixed(2);
      };
      confEl.addEventListener("input", syncSliders);
      iouEl.addEventListener("input", syncSliders);
      syncSliders();

      fileEl.addEventListener("change", () => {
        setError("");
        jsonEl.textContent = "{}";
        annotImg.removeAttribute("src");
        renderDetections([]);
        const f = fileEl.files && fileEl.files[0];
        runEl.disabled = !f;
        if (f) inputImg.src = URL.createObjectURL(f);
      });

      runEl.addEventListener("click", async () => {
        const f = fileEl.files && fileEl.files[0];
        if (!f) return;

        setError("");
        setStatus("uploading...");
        runEl.disabled = true;

        try {
          const form1 = new FormData();
          form1.append("file", f, f.name);
          form1.append("conf", confEl.value);
          form1.append("iou", iouEl.value);

          const form2 = new FormData();
          form2.append("file", f, f.name);
          form2.append("conf", confEl.value);
          form2.append("iou", iouEl.value);

          const [jsonResp, annotResp] = await Promise.all([
            fetch("/predict/image", { method: "POST", body: form1 }),
            fetch("/predict/image/annotated", { method: "POST", body: form2 }),
          ]);

          if (!jsonResp.ok) {
            const txt = await jsonResp.text();
            throw new Error("JSON request failed: " + jsonResp.status + " " + txt);
          }
          const data = await jsonResp.json();
          const mode = jsonResp.headers.get("X-Pothole-Mode") || "unknown";
          jsonEl.textContent = JSON.stringify(data, null, 2);
          renderDetections((data && data.detections) ? data.detections : []);

          if (!annotResp.ok) {
            const txt = await annotResp.text();
            throw new Error("Annotated request failed: " + annotResp.status + " " + txt);
          }
          const blob = await annotResp.blob();
          annotImg.src = URL.createObjectURL(blob);

          setStatus("done (" + mode + ")");
        } catch (e) {
          setStatus("error");
          setError(String(e && e.message ? e.message : e));
        } finally {
          runEl.disabled = false;
        }
      });

      const stopTrainPoll = () => {
        if (trainPoll) {
          clearInterval(trainPoll);
          trainPoll = null;
        }
      };

      const pollTrain = async () => {
        if (!trainJobId) return;
        try {
          const resp = await fetch(`/train/status/${trainJobId}`);
          if (!resp.ok) {
            if (resp.status === 403) {
              setTrainStatus("disabled");
              trainMsg.textContent = "Enable training: set ENABLE_TRAINING_API=1 on the server.";
              stopTrainPoll();
              return;
            }
            throw new Error("Status failed: " + resp.status);
          }
          const data = await resp.json();
          setTrainStatus(data.status || "unknown");
          trainMsg.textContent = data.message || "";
          if (data.status === "succeeded" || data.status === "failed") {
            stopTrainPoll();
          }
        } catch (e) {
          setTrainStatus("error");
          trainMsg.textContent = String(e && e.message ? e.message : e);
          stopTrainPoll();
        }
      };

      startTrain.addEventListener("click", async () => {
        setTrainStatus("starting...");
        trainMsg.textContent = "";
        stopTrainPoll();
        trainJobId = null;

        const payload = {
          data: dataYaml.value,
          model: baseModel.value,
          epochs: Number(epochs.value || 50),
          imgsz: Number(imgsz.value || 640),
          batch: Number(batch.value || 16),
          device: device.value || "cpu",
        };

        try {
          const resp = await fetch("/train/start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!resp.ok) {
            const txt = await resp.text();
            if (resp.status === 403) {
              setTrainStatus("disabled");
              trainMsg.textContent = "Enable training: set ENABLE_TRAINING_API=1 on the server.";
              return;
            }
            throw new Error(`Start failed: ${resp.status} ${txt}`);
          }
          const data = await resp.json();
          trainJobId = data.job_id;
          setTrainStatus("queued");
          trainMsg.textContent = "Job: " + trainJobId;
          trainPoll = setInterval(pollTrain, 2000);
          pollTrain();
        } catch (e) {
          setTrainStatus("error");
          trainMsg.textContent = String(e && e.message ? e.message : e);
        }
      });

      // Initialize train status (shows disabled if not enabled)
      setTrainStatus("idle");
    </script>
  </body>
</html>
"""


@app.get("/", response_class=HTMLResponse)
def demo_ui() -> str:
    return _DEMO_HTML


def _run_training_job(job_id: str, req: TrainRequest) -> None:
    with _train_lock:
        _train_jobs[job_id] = {"status": "running", "message": "Training started"}
    try:
        from ultralytics import YOLO

        model = YOLO(req.model)
        model.train(
            data=req.data,
            epochs=req.epochs,
            imgsz=req.imgsz,
            batch=req.batch,
            device=req.device,
        )
        with _train_lock:
            _train_jobs[job_id] = {"status": "succeeded", "message": "Training finished. Check runs/detect/ for outputs."}
    except Exception as e:
        with _train_lock:
            _train_jobs[job_id] = {"status": "failed", "message": str(e)}


@app.post("/train/start", response_model=TrainStartResponse)
def train_start(req: TrainRequest) -> TrainStartResponse:
    if not _ENABLE_TRAINING:
        raise HTTPException(
            status_code=403,
            detail="Training API is disabled. Set ENABLE_TRAINING_API=1 to enable local training.",
        )
    job_id = uuid.uuid4().hex
    with _train_lock:
        _train_jobs[job_id] = {"status": "queued", "message": "Queued"}
    t = threading.Thread(target=_run_training_job, args=(job_id, req), daemon=True)
    t.start()
    return TrainStartResponse(job_id=job_id)


@app.get("/train/status/{job_id}", response_model=TrainStatusResponse)
def train_status(job_id: str) -> TrainStatusResponse:
    if not _ENABLE_TRAINING:
        raise HTTPException(status_code=403, detail="Training API is disabled.")
    with _train_lock:
        job = _train_jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Unknown job_id")
    return TrainStatusResponse(job_id=job_id, status=str(job.get("status")), message=job.get("message"))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict/image", response_model=PredictResponse)
async def predict_image(
    file: UploadFile = File(...),
    conf: float | None = Form(None),
    iou: float | None = Form(None),
) -> Response:
    try:
        image_bytes = await file.read()
        pil_img = load_image_bytes(image_bytes)
        try:
            detections = predict_from_pil(pil_img, conf=conf, iou=iou)
            mode = "yolo"
        except Exception:
            # Fallback for demos when weights are missing or model can't load.
            detections = heuristic_detect_potholes(pil_img)
            mode = "heuristic"
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {e}") from e

    resp = PredictResponse(
        detections=[
            DetectionOut(
                class_id=d.class_id,
                class_name=d.class_name,
                confidence=d.confidence,
                severity=getattr(d, "severity", "Neutral"),
                x1=d.x1,
                y1=d.y1,
                x2=d.x2,
                y2=d.y2,
            )
            for d in detections
        ]
    )
    return JSONResponse(content=resp.model_dump(), headers={"X-Pothole-Mode": mode})


@app.post("/predict/image/annotated")
async def predict_image_annotated(
    file: UploadFile = File(...),
    conf: float | None = Form(None),
    iou: float | None = Form(None),
) -> Response:
    try:
        image_bytes = await file.read()
        pil_img = load_image_bytes(image_bytes)
        try:
            detections = predict_from_pil(pil_img, conf=conf, iou=iou)
            mode = "yolo"
        except Exception:
            detections = heuristic_detect_potholes(pil_img)
            mode = "heuristic"
        png = draw_detections(pil_img, detections)
        return Response(content=png, media_type="image/png", headers={"X-Pothole-Mode": mode})
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Annotated prediction failed: {e}") from e
