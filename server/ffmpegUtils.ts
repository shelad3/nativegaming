
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';

if (ffmpegInstaller) {
    ffmpeg.setFfmpegPath(ffmpegInstaller);
}

export const extractClip = (inputPath: string, outputPath: string, start: string, duration: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .setStartTime(start)
            .setDuration(duration)
            .output(outputPath)
            .on('end', () => {
                console.log(`[FFMPEG] Extraction complete: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error(`[FFMPEG] Extraction failed: ${err.message}`);
                reject(err);
            })
            .run();
    });
};

export const generateThumbnail = (inputPath: string, outputPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .screenshots({
                timestamps: ['00:00:01'],
                filename: path.basename(outputPath),
                folder: path.dirname(outputPath),
                size: '1280x720'
            })
            .on('end', () => {
                console.log(`[FFMPEG] Thumbnail generated: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error(`[FFMPEG] Thumbnail generation failed: ${err.message}`);
                reject(err);
            });
    });
};
