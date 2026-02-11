"use client";

import QRCode from "qrcode";

const VERIFICATION_BASE_URL = process.env.NEXT_PUBLIC_VERIFICATION_URL || "";

export function getVerificationUrl(hash: string): string {
    if (VERIFICATION_BASE_URL) {
        return `${VERIFICATION_BASE_URL}/${hash}`;
    }
    if (typeof window !== "undefined") {
        return `${window.location.origin}/verificar/${hash}`;
    }
    return `/verificar/${hash}`;
}

export async function generateQRCodeDataURL(hash: string): Promise<string> {
    const url = getVerificationUrl(hash);
    return QRCode.toDataURL(url, {
        width: 200,
        margin: 2,
        color: {
            dark: "#000000",
            light: "#FFFFFF",
        },
        errorCorrectionLevel: "H",
    });
}

export async function generateQRCodeSVG(hash: string): Promise<string> {
    const url = getVerificationUrl(hash);
    return QRCode.toString(url, {
        type: "svg",
        width: 200,
        margin: 2,
        errorCorrectionLevel: "H",
    });
}
