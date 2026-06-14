# Kaggle pothole dataset drop folder

Paste your downloaded dataset here.

For YOLO training you need **images + bounding-box labels** in YOLO format:

```
datasets/kaggle_potholes/
  images/
    train/
      (subfolders ok)
    val/
      (subfolders ok)
  labels/
    train/
      (same subfolders as images)
    val/
      (same subfolders as images)
```

- Images: `.jpg` / `.png`
- Labels: matching `.txt` files (same filename as image) with lines:
  `class_id x_center y_center width height` (normalized 0..1)

If your Kaggle dataset is *images only* (no labels), it can’t be used for training until you label it (LabelImg/Roboflow/etc.).

## LabelImg note (important)

LabelImg does **not** browse images recursively. Your images are in subfolders like:

- `images/train/potholes/`
- `images/train/normal/`

So in LabelImg use **Open Dir** and select the *subfolder*, e.g.:

- Open Dir: `datasets/kaggle_potholes/images/train/potholes`
- Change Save Dir: `datasets/kaggle_potholes/labels/train/potholes`

Repeat for `val/potholes` and `val/normal`.
