import mongoose, { Schema, Document } from 'mongoose';

export interface ITheme extends Document {
    name: string;
    type: 'banner' | 'animation' | 'effect' | 'font' | 'profile' | 'bundle';
    price: number;
    description: string;
    previewUrl: string;
    assets: {
        bannerUrl?: string;
        animationClass?: string;
        customCSS?: string;
        fontFamily?: string;
        fontUrl?: string;
        profileEffect?: string;
        colors?: {
            primary?: string;
            secondary?: string;
            accent?: string;
        };
    };
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    isLimited: boolean;
    createdAt: Date;
}

const ThemeSchema: Schema = new Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['banner', 'animation', 'effect', 'font', 'profile', 'bundle'], required: true },
    price: { type: Number, required: true },
    description: { type: String },
    previewUrl: { type: String },
    assets: {
        bannerUrl: { type: String },
        animationClass: { type: String },
        customCSS: { type: String },
        fontFamily: { type: String },
        fontUrl: { type: String },
        profileEffect: { type: String },
        colors: {
            primary: { type: String },
            secondary: { type: String },
            accent: { type: String }
        }
    },
    rarity: { type: String, enum: ['Common', 'Rare', 'Epic', 'Legendary'], default: 'Common' },
    isLimited: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model<ITheme>('Theme', ThemeSchema);
