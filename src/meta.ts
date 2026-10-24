import {
  AppWindow, AtSign, BadgePercent, Binary, Blend, Braces, Calculator, CalendarClock, CalendarDays, CaseSensitive, Clock, Code, Coins, Combine, Contact,
  Crop, Database, Dices, Diff, Droplets, Eraser, FileCode, FileDigit, FileImage, FileJson, FileOutput, FileStack, FileText, FileType, Fingerprint, Gauge,
  Globe, Hash, HeartPulse, Image, Images, IndianRupee, Info, Keyboard, KeyRound, Landmark, LayoutGrid, Link, Link2, ListOrdered, Lock, Mail, MessageCircle,
  Minimize2, MonitorSmartphone, Network, Palette, Percent, Phone, PiggyBank, Pilcrow, Pipette, QrCode, Quote, Radio, Ratio, Receipt, Regex, Repeat, Replace,
  Ruler, ScanText, Scissors, ScrollText, Server, Share2, Shield, Square, Stamp, Table, Tags, Terminal, Text, Timer, TrendingUp, Type, Wallet, Wifi,
  Wrench, Code2, PenTool, Briefcase, Scissors as ScissorsIcon, Eraser as EraserIcon, IdCard, FileDown, Smartphone, ScanLine, Barcode, Signature, Film, Music, FileSignature, ScanEye, Laugh, LayoutDashboard, Spline, Sheet, FileArchive, FileLock2, LockOpen, FileType2, FileVideo, type LucideIcon,
} from 'lucide-react'
import type { Category } from './registry'

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  Image: Image, PDF: FileText, 'Video & Audio': Film, Text: Type, Developer: Code2, 'Web & SEO': Globe, Design: PenTool, 'QR Codes': QrCode, 'Finance & India': IndianRupee, Everyday: Briefcase,
}

export const TOOL_ICONS: Record<string, LucideIcon> = {
  'image-compressor': Minimize2, 'image-editor': Crop, 'image-converter': Repeat, 'image-watermark': Stamp, 'exif-viewer': Info, 'image-palette': Pipette,
  'favicon-generator': AppWindow, 'social-image-resizer': Share2, 'image-base64': FileCode, 'background-remover': ScissorsIcon, 'watermark-remover': EraserIcon,
  'exam-photo-resizer': IdCard, 'compress-image-to-size': FileDown, 'heic-to-jpg': Smartphone, 'qr-scanner': ScanLine, 'barcode-generator': Barcode, 'signature-maker': Signature,
  'ssc-photo-resizer': IdCard, 'bank-exam-photo-resizer': IdCard, 'upsc-photo-resizer': IdCard, 'neet-photo-resizer': IdCard, 'signature-resizer': Signature,
  'compress-image-to-20kb': FileDown, 'compress-image-to-50kb': FileDown, 'compress-image-to-100kb': FileDown, 'compress-image-to-200kb': FileDown, 'compress-image-to-500kb': FileDown, 'compress-image-to-1mb': FileDown,
  'jpg-to-png': Repeat, 'png-to-jpg': Repeat, 'webp-to-jpg': Repeat, 'jpg-to-webp': Repeat, 'png-to-webp': Repeat, 'jpg-to-pdf': FileImage, 'pdf-to-jpg': Images, 'rotate-pdf': LayoutGrid, 'age-calculator': CalendarDays, 'character-counter': Pilcrow,
  'pdf-merge': Combine, 'pdf-split': Scissors, 'pdf-organize': LayoutGrid, 'image-to-pdf': FileImage, 'pdf-to-image': Images, 'pdf-page-numbers': ListOrdered,
  'pdf-watermark': Droplets, 'pdf-to-text': ScanText, 'pdf-compress': FileStack,
  'word-counter': Pilcrow, 'case-converter': CaseSensitive, 'text-cleaner': Eraser, 'find-replace': Replace, 'text-extractor': AtSign, 'line-tools': ListOrdered,
  'text-diff': Diff, 'lorem-ipsum': Quote, 'markdown-preview': FileType, slugify: Link, 'unicode-inspector': Text, 'morse-code': Radio,
  'json-formatter': Braces, 'yaml-json': FileJson, 'csv-json': Table, 'sql-formatter': Database, base64: Binary, 'url-encode': Link2, 'jwt-decoder': KeyRound,
  'html-entities': Code, 'string-escape': Terminal, 'regex-tester': Regex, hash: Fingerprint, uuid: Hash, timestamp: Clock, cron: CalendarClock,
  'number-base': FileDigit, chmod: Shield,
  'meta-tags': Tags, 'utm-builder': Link2, 'user-agent': MonitorSmartphone, cidr: Network, 'http-status': Server,
  'color-converter': Palette, gradient: Blend, 'box-shadow': Square, 'svg-minifier': FileOutput, 'aspect-ratio': Ratio,
  'qr-code': QrCode, 'qr-wifi': Wifi, 'qr-vcard': Contact, 'qr-upi': IndianRupee, 'qr-whatsapp': MessageCircle, 'qr-email': Mail, 'qr-phone': Phone,
  gst: Receipt, emi: Landmark, sip: TrendingUp, 'compound-interest': PiggyBank, 'ctc-inhand': Wallet, 'salary-hike': BadgePercent, 'profit-margin': Coins,
  inflation: Gauge, 'lakh-crore': ScrollText, 'rupees-words': IndianRupee, percentage: Percent, 'tip-split': Receipt,
  calculator: Calculator, 'unit-converter': Ruler, timezone: Globe, 'date-diff': CalendarDays, timer: Timer, password: Lock, bmi: HeartPulse,
  'passport-photo': IdCard, 'image-to-text': ScanEye, 'meme-maker': Laugh, 'collage-maker': LayoutDashboard, 'image-to-svg': Spline,
  'protect-pdf': FileLock2, 'unlock-pdf': LockOpen, 'pdf-to-word': FileType2, 'compress-video': FileVideo,
  'sign-pdf': FileSignature, 'crop-pdf': Crop, 'video-to-mp3': Music, 'video-to-gif': Film, 'excel-csv': Sheet, 'zip-tool': FileArchive,
  random: Dices, 'typing-test': Keyboard,
}
export const toolIcon = (id: string, category: Category): LucideIcon => TOOL_ICONS[id] ?? CATEGORY_ICONS[category] ?? Wrench

// Curated: tools added in the latest release, newest first. Not a popularity measure.
export const RECENTLY_ADDED = ['pdf-to-word', 'compress-video', 'unlock-pdf', 'protect-pdf', 'sign-pdf', 'passport-photo', 'image-to-text', 'video-to-mp3', 'excel-csv', 'collage-maker', 'video-to-gif', 'crop-pdf', 'image-to-svg', 'meme-maker', 'zip-tool', 'exam-photo-resizer', 'compress-image-to-size', 'heic-to-jpg', 'qr-scanner', 'barcode-generator', 'signature-maker', 'background-remover', 'watermark-remover', 'pdf-merge', 'pdf-split', 'pdf-organize', 'image-to-pdf', 'pdf-to-image', 'pdf-compress', 'image-editor', 'image-converter', 'exif-viewer', 'favicon-generator', 'social-image-resizer', 'gst', 'sip', 'ctc-inhand', 'qr-upi', 'qr-wifi', 'meta-tags', 'cidr', 'typing-test', 'text-cleaner']
export const NEW_SET = new Set(RECENTLY_ADDED.concat(['ssc-photo-resizer', 'bank-exam-photo-resizer', 'upsc-photo-resizer', 'neet-photo-resizer', 'signature-resizer', 'pdf-page-numbers', 'pdf-watermark', 'pdf-to-text', 'image-watermark', 'image-palette', 'compound-interest', 'salary-hike', 'profit-margin', 'inflation', 'lakh-crore', 'rupees-words', 'qr-vcard', 'qr-whatsapp', 'qr-email', 'qr-phone', 'find-replace', 'text-extractor', 'morse-code', 'utm-builder', 'user-agent']))

// Built-in starter pockets: shortcuts into the catalogue, separate from the person's own pockets
export const STARTER_POCKETS: { slug: string; name: string; description: string; toolIds: string[] }[] = [
  { slug: 'office', name: 'Office work', description: 'Documents, PDFs and everyday paperwork', toolIds: ['pdf-merge', 'pdf-split', 'image-to-pdf', 'pdf-to-text', 'word-counter', 'text-cleaner', 'rupees-words', 'gst', 'date-diff', 'csv-json'] },
  { slug: 'developer', name: 'Developer kit', description: 'Formatters, encoders and debugging helpers', toolIds: ['json-formatter', 'yaml-json', 'base64', 'jwt-decoder', 'regex-tester', 'timestamp', 'uuid', 'sql-formatter', 'cron', 'text-diff'] },
  { slug: 'creator', name: 'Creator & social', description: 'Images sized and ready to post', toolIds: ['social-image-resizer', 'image-compressor', 'image-editor', 'image-watermark', 'qr-code', 'favicon-generator', 'meta-tags', 'utm-builder'] },
  { slug: 'money', name: 'Money matters', description: 'Salary, loans, savings and tax', toolIds: ['ctc-inhand', 'salary-hike', 'emi', 'sip', 'compound-interest', 'gst', 'inflation', 'percentage'] },
]
