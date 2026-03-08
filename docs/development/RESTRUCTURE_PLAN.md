# Professional Code Restructuring Plan

## Objective
Restructure the Mahalakshmi Jewellery project for professional client submission while maintaining 100% functionality.

## Current Issues
1. 30+ documentation/guide MD files cluttering root directory
2. Multiple batch files in root
3. Test scripts mixed with production code
4. No clear separation between development and production files
5. Inconsistent file organization

## Restructuring Strategy

### Phase 1: Clean Root Directory
**Move to `/docs` folder:**
- All .md documentation files
- Deployment guides
- Testing guides
- Implementation notes

**Move to `/scripts/dev` folder:**
- All .bat files (development scripts)
- Test PowerShell scripts

### Phase 2: Organize Frontend Assets
**Current:** `/public` (mixed structure)
**New Structure:**
```
/public
  /assets
    /css
    /js
    /images
  /pages
    - index.html (client)
    - admin.html
    - buy.html
    - rental.html
```

### Phase 3: Backend Organization
**Keep clean structure:**
```
/config      - Configuration files
/middleware  - Express middleware
/routes      - API routes
/services    - Business logic
/utils       - Utility functions
/scripts     - Database & deployment scripts
```

### Phase 4: Create Professional Documentation
**Root level files (only):**
- README.md (comprehensive)
- package.json
- server.js
- .env.example
- .gitignore
- render.yaml

### Phase 5: Testing & Verification
- Verify all imports/paths still work
- Test all API endpoints
- Test frontend pages
- Verify deployment configuration

## Execution Order
1. Create new folder structure
2. Move files systematically
3. Update all import paths
4. Update HTML script/link references
5. Test thoroughly
6. Create final README.md

## Safety Measures
- Keep backup of original structure
- Test after each major move
- Update paths incrementally
- Verify functionality continuously
