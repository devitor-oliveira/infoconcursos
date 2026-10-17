const fs = require('fs')
const path = require('path')

const distDir = path.resolve(__dirname, '..', 'dist')
const producaoDir = path.join(distDir, 'producao')
const testesDir = path.join(distDir, 'testes')

if (!fs.existsSync(distDir)) {
  console.error('[organize-dist] Diretório dist não existe!')
  process.exit(1)
}

if (!fs.existsSync(producaoDir)) {
  fs.mkdirSync(producaoDir, { recursive: true })
}
if (!fs.existsSync(testesDir)) {
  fs.mkdirSync(testesDir, { recursive: true })
}

const entries = fs.readdirSync(distDir, { withFileTypes: true })

for (const entry of entries) {
  const name = entry.name
  if (name === 'producao' || name === 'testes') continue

  const fullPath = path.join(distDir, name)

  // NSIS installer oficial e metadados de release -> produção
  if (name.includes('Setup') && (name.endsWith('.exe') || name.endsWith('.blockmap') || name.endsWith('.exe.sig') || name.endsWith('.yml'))) {
    const dest = path.join(producaoDir, name)
    fs.copyFileSync(fullPath, dest)
    console.log(`[organize-dist] -> PRODUCAO: ${name}`)
  }
  // Executável Portátil -> testes
  else if (name.endsWith('.exe') && !name.includes('Setup')) {
    const dest = path.join(testesDir, name)
    fs.copyFileSync(fullPath, dest)
    console.log(`[organize-dist] -> TESTES (Portable): ${name}`)
  }
  // Pasta win-unpacked -> testes
  else if (entry.isDirectory() && name === 'win-unpacked') {
    const dest = path.join(testesDir, name)
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true })
    }
    fs.cpSync(fullPath, dest, { recursive: true })
    console.log(`[organize-dist] -> TESTES (Win-Unpacked): ${name}`)
  }
  // Metadados de configuração e debug do builder -> testes
  else if (name.endsWith('.yaml') || name.endsWith('.yml')) {
    const dest = path.join(testesDir, name)
    fs.copyFileSync(fullPath, dest)
  }
}

console.log('[organize-dist] Artefatos organizados com sucesso em dist/producao e dist/testes!')
