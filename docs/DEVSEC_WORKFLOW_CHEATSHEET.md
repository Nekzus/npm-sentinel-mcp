# Manual y Guía del Desarrollador: Flujo de Trabajo DevSecOps & Releases

> [!NOTE]
> **Documento Interno de Desarrollo (No Publicado en npm):**
> Este archivo sirve como guía de referencia rápida para la gestión del repositorio, la jerarquía de ramas, la firma criptográfica y el procedimiento completo de promoción a producción (`main`).

---

## 1. Reglas Fundamentales del Repositorio

1. **Firma Criptográfica GPG:** Todo commit local debe firmarse con tu clave GPG (`git commit -S`).
2. **Conventional Commits:** Los mensajes de commit deben seguir el estándar en **Inglés**:
   - `fix(scope): description` -> Genera PATCH release (`1.0.0` -> `1.0.1`)
   - `feat(scope): description` -> Genera MINOR release (`1.0.0` -> `1.1.0`)
   - `feat(scope)!: description` -> Genera MAJOR release (`1.0.0` -> `2.0.0`)
   - `chore:`, `docs:`, `style:`, `refactor:`, `test:` -> Sin impacto en versión
3. **Idioma:** Código, comentarios, commits y documentos del proyecto en **Inglés**. Guías internas y notas personales en **Español**.

---

## 2. Jerarquía de Ramas y Flujo Continuo

```
[feat/*] / [fix/*] --------(PR + Squash)--------> [alpha] --------(PR + Verified)--------> [main]
(Desarrollo Aislado)                              (Pre-Release: v1.25.0-alpha.X)            (Producción: v1.25.0)
```

---

## 3. Guía Paso a Paso: Desarrollo Diario (`feat/*` -> `alpha`)

### Paso 1: Sincronizar `alpha` local antes de empezar
```bash
git checkout alpha
git fetch --prune
git pull --rebase origin alpha
```

### Paso 2: Crear rama de trabajo aislada desde `alpha`
```bash
git checkout -b feat/my-new-feature
```

### Paso 3: Trabajar y realizar commits firmados GPG
```bash
git add .
git commit -S -m "feat(security): implement strict token rate limiter"
```

### Paso 4: Sincronizar tu rama si `alpha` avanzó en remoto
```bash
git fetch origin alpha
git rebase origin/alpha
```

### Paso 5: Publicar rama de trabajo
```bash
git push -u origin feat/my-new-feature
```

### Paso 6: Abrir PR y fusionar hacia `alpha`
- Abrir PR apuntando a `alpha`.
- Al aprobar e integrar con **Squash & Merge** en GitHub UI o `gh CLI`:
  ```bash
  gh pr merge --squash --delete-branch
  ```
- **Resultado Automático:** GitHub Actions ejecuta `publish.yml` en `alpha` y genera la versión pre-release `v1.25.0-alpha.X` publicada a npm con etiqueta `alpha` y firma **Verified**.

### Paso 7: Limpieza local tras el Merge
```bash
git checkout alpha
git fetch --prune
git pull --rebase origin alpha
git branch -d feat/my-new-feature
```

---

## 4. Guía Paso a Paso: Promoción a Producción (`alpha` -> `main`)

Cuando las características probadas en `alpha` están consolidadas y listas para el lanzamiento oficial a producción (`npmjs.com` etiqueta `latest`):

### Paso 1: Verificar estabilidad de la pre-release en `alpha`
Asegurarse de que los workflows de CI en `alpha` hayan pasado el 100% de los tests y linters.

### Paso 2: Sincronizar ramas locales (`main` y `alpha`)
```bash
git checkout main
git fetch --prune
git pull --rebase origin main
git checkout alpha
git pull --rebase origin alpha
```

### Paso 3: Abrir Pull Request de Promoción (`alpha` -> `main`)

#### Opción A (Vía `gh CLI`):
```bash
gh pr create \
  --base main \
  --head alpha \
  --title "release(v1.25.0): promote alpha to production main" \
  --body "Promotes pre-release features and stability patches from alpha to production main."
```

#### Opción B (Vía GitHub UI):
Navegar a: `https://github.com/Nekzus/npm-sentinel-mcp/compare/main...alpha?expand=1`

### Paso 4: Aprobar y Fusionar en GitHub
En la interfaz de GitHub, aprobar el PR y seleccionar **Squash & Merge** o **Rebase & Merge** segun la política deseada.

#### Resultado Automático en Producción:
1. GitHub Actions dispara `publish.yml` en `main`.
2. `semantic-release` analiza el historial consolidado, bumping la versión oficial (ej: `v1.25.0`).
3. Se publica el paquete a `npmjs.com` bajo la etiqueta oficial `latest` con atestaciones **SLSA Level 3 (npm Provenance)**.
4. Se registra la nueva versión en el **MCP Registry oficial de Anthropic/ModelContextProtocol**.
5. Se actualiza la etiqueta de versión en la imagen de Dockerfile.

### Paso 5: Sincronización Post-Release (`main` -> `alpha`)
Para asegurar que `alpha` se mantenga exactamente alineada con la versión base de `main` recién publicada:

```bash
git checkout alpha
git fetch --prune
git rebase origin/main
git push origin alpha
```

---

## 5. Guía de Parches de Emergencia (`hotfix/*` directamente a `main`)

Para solucionar un bug crítico en producción sin esperar la iteración de `alpha`:

1. **Crear rama hotfix desde `main`:**
   ```bash
   git checkout main
   git pull --rebase origin main
   git checkout -b hotfix/critical-security-patch
   ```
2. **Commit firmado GPG:**
   ```bash
   git commit -S -m "fix(security): patch critical vulnerability in payload handler"
   ```
3. **PR directo a `main`:**
   ```bash
   gh pr create --base main --fill
   ```
4. **Al fusionar:** Se genera un PATCH release de producción inmediato (`v1.25.1`).
5. **Retro-alimentar a `alpha`:**
   ```bash
   git checkout alpha
   git fetch --prune
   git rebase origin/main
   git push origin alpha
   ```
