# VisionBrave

Plataforma SaaS de criação com IA — geração de Imagens, Vídeos e Áudio.

> Design system próprio: preto puro + dourado (`#FBBF24`), Inter font, logo raposa.

## Telas

| Tela | Status | Arquivo |
|------|--------|---------|
| Landing Page | ✅ Mockup | `mockups/landing.html` |
| Sign Up / Log In | ✅ Mockup | `mockups/signup.html` |
| Home / Dashboard | ✅ Mockup | `mockups/home.html` |
| Generate Images | ✅ Mockup | `mockups/generate-images.html` |
| Generate Videos / Editor | ✅ Mockup | `mockups/generate-videos.html` |
| Gallery | ✅ Mockup | `mockups/gallery.html` |
| Generate Audio | 🔜 Pendente | — |

## Stack (planejado)

- **Frontend:** Next.js 14 + Tailwind CSS + shadcn/ui
- **Auth:** Supabase Auth
- **DB:** Supabase (PostgreSQL)
- **IA:** APIs externas (imagem, vídeo, áudio)

## Mockups

Os mockups HTML estão em `/mockups`. Para visualizar:

```bash
npx serve mockups
# abre http://localhost:3000/index.html
```

O `index.html` lista todas as telas com previews navegáveis.
