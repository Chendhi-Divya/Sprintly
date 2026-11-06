
import type { Request, Response } from "express";
import mongoose from "mongoose";

import Task from "../models/task.js";

const BUCKET_NAME = "taskAttachments";

// Get the MongoDB GridFS bucket.
function getAttachmentBucket() {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error("MongoDB connection is not ready");
  }

  return new mongoose.mongo.GridFSBucket(db, {
    bucketName: BUCKET_NAME,
  });
}

// UPLOAD TASK ATTACHMENT
export const uploadTaskAttachment = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid task ID",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Please select a file to upload",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const bucket = getAttachmentBucket();

    // Save the actual file in MongoDB GridFS.
    const fileId = await new Promise<mongoose.Types.ObjectId>(
      (resolve, reject) => {
        const uploadStream = bucket.openUploadStream(
          req.file!.originalname,
          {
            metadata: {
              taskId: task._id,
              contentType: req.file!.mimetype,
            },
          }
        );

        uploadStream.on("finish", () => {
          resolve(uploadStream.id as mongoose.Types.ObjectId);
        });

        uploadStream.on("error", reject);

        uploadStream.end(req.file!.buffer);
      }
    );

    const protocol =
      req.get("x-forwarded-proto")?.split(",")[0] ||
      req.protocol;

    const fileUrl =
      `${protocol}://${req.get("host")}` +
      `${req.baseUrl}/${id}/attachments/${fileId}`;

    // Save attachment information inside the task document.
    task.attachments.push({
      fileId,
      filename: req.file.originalname,
      originalName: req.file.originalname,
      url: fileUrl,
      mimetype: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date(),
    });

    try {
      await task.save();
    } catch (saveError) {
      // Remove the GridFS file if its task metadata could not be saved.
      await bucket.delete(fileId).catch((deleteError) => {
        console.error(
          "GRIDFS CLEANUP ERROR:",
          deleteError
        );
      });

      throw saveError;
    }

    const uploadedAttachment = task.attachments.find(
      (attachment) =>
        attachment.fileId.toString() === fileId.toString()
    );

    return res.status(201).json({
      message: "Attachment uploaded successfully",
      attachment: uploadedAttachment,
      task,
    });
  } catch (error) {
    console.error("UPLOAD TASK ATTACHMENT ERROR:", error);

    return res.status(500).json({
      message: "Failed to upload attachment",
      error:
        error instanceof Error
          ? error.message
          : "Unknown upload error",
    });
  }
};

// VIEW / DOWNLOAD TASK ATTACHMENT
export const getTaskAttachment = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const fileId = Array.isArray(req.params.fileId)
      ? req.params.fileId[0]
      : req.params.fileId;

    if (!fileId) {
      return res.status(400).json({
        message: "Invalid task or attachment ID",
      });
    }

    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(fileId)
    ) {
      return res.status(400).json({
        message: "Invalid task or attachment ID",
      });
    }

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        message: "Task not found",
      });
    }

    const attachment = task.attachments.find(
      (item) => item.fileId.toString() === fileId
    );

    if (!attachment) {
      return res.status(404).json({
        message: "Attachment not found for this task",
      });
    }

    const bucket = getAttachmentBucket();

    res.setHeader(
      "Content-Type",
      attachment.mimetype || "application/octet-stream"
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(
        attachment.originalName
      )}`
    );

    res.setHeader("X-Content-Type-Options", "nosniff");

    const downloadStream = bucket.openDownloadStream(
      new mongoose.Types.ObjectId(fileId)
    );

    downloadStream.on("error", (error) => {
      console.error("GET TASK ATTACHMENT ERROR:", error);

      if (!res.headersSent) {
        res.status(404).json({
          message: "File could not be found in storage",
        });
      } else {
        res.destroy(error);
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    console.error("GET TASK ATTACHMENT ERROR:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to retrieve attachment",
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      });
    }
  }
};
