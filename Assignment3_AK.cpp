#define STB_IMAGE_IMPLEMENTATION
#include <GL/glut.h>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
#include "stb_image.h"

static const float DEG2RAD = 3.14159265f / 180.0f;
float g_cameraPosX = 0.0f;
float g_cameraPosY = 3.0f; 
float g_cameraPosZ = 10.0f;
float g_cameraCenterX = 0.0f;
float g_cameraCenterY = 1.0f;
float g_cameraCenterZ = 0.0f;
float g_upX = 0.0f;
float g_upY = 1.0f;
float g_upZ = 0.0f;
float g_verticalFov = 60.0f;
float g_horizontalFov = 60.0f;
float g_nearPlane = 0.1f;
float g_farPlane = 100.0f;
float g_modelRotX = 0.0f;
float g_modelRotY = 0.0f;
float g_modelRotZ = 0.0f;
float g_modelPosX = 0.0f;
float g_modelPosY = -1.0f; 
float g_modelPosZ = 0.0f;
bool g_wireframe = false;
bool g_lightingEnabled = true;
bool g_light0On = true;
bool g_light1On = false;
bool g_useFlatShading = false;
float g_globalAmbient[4] = { 0.2f, 0.2f, 0.2f, 1.0f };
bool g_textureEnabled = true;

struct Vertex { float x, y, z; };
struct Normal { float nx, ny, nz; };
struct TexCoord { float u, v; };
std::vector<Vertex> g_vertices;
std::vector<Normal> g_normals;
std::vector<TexCoord> g_texcoords;
std::vector<unsigned int> g_indices;
GLuint g_textureID = 0;

struct CowTransform { float tx, ty, tz; float rx, ry, rz; };
std::vector<CowTransform> g_cowPositions;
int g_lastMouseX = 0;
int g_lastMouseY = 0;
bool g_mouseLeftDown = false;

void generateDefaultTexCoords() {
    float minX = 1e30f, maxX = -1e30f, minZ = 1e30f, maxZ = -1e30f;
    for (size_t i = 0; i < g_vertices.size(); i++) {
        if (g_vertices[i].x < minX) minX = g_vertices[i].x;
        if (g_vertices[i].x > maxX) maxX = g_vertices[i].x;
        if (g_vertices[i].z < minZ) minZ = g_vertices[i].z;
        if (g_vertices[i].z > maxZ) maxZ = g_vertices[i].z;
    }
    float rangeX = maxX - minX;
    float rangeZ = maxZ - minZ;
    if (rangeX < 1e-6f) rangeX = 1.0f;
    if (rangeZ < 1e-6f) rangeZ = 1.0f;
    for (size_t i = 0; i < g_vertices.size(); i++) {
        g_texcoords[i].u = (g_vertices[i].x - minX) / rangeX;
        g_texcoords[i].v = (g_vertices[i].z - minZ) / rangeZ;
    }
}

static void computeNormals() {
    g_normals.resize(g_vertices.size());
    for (size_t i = 0; i < g_normals.size(); i++) {
        g_normals[i].nx = 0.0f;
        g_normals[i].ny = 0.0f;
        g_normals[i].nz = 0.0f;
    }
    for (size_t i = 0; i < g_indices.size(); i += 3) {
        unsigned int i0 = g_indices[i + 0];
        unsigned int i1 = g_indices[i + 1];
        unsigned int i2 = g_indices[i + 2];
        const Vertex& v0 = g_vertices[i0];
        const Vertex& v1 = g_vertices[i1];
        const Vertex& v2 = g_vertices[i2];
        float ux = v1.x - v0.x;
        float uy = v1.y - v0.y;
        float uz = v1.z - v0.z;
        float vx = v2.x - v0.x;
        float vy = v2.y - v0.y;
        float vz = v2.z - v0.z;
        float nx = uy * vz - uz * vy;
        float ny = uz * vx - ux * vz;
        float nz = ux * vy - uy * vx;
        g_normals[i0].nx += nx; g_normals[i0].ny += ny; g_normals[i0].nz += nz;
        g_normals[i1].nx += nx; g_normals[i1].ny += ny; g_normals[i1].nz += nz;
        g_normals[i2].nx += nx; g_normals[i2].ny += ny; g_normals[i2].nz += nz;
    }
    for (size_t i = 0; i < g_normals.size(); i++) {
        float length = std::sqrt(g_normals[i].nx * g_normals[i].nx +
            g_normals[i].ny * g_normals[i].ny +
            g_normals[i].nz * g_normals[i].nz);
        if (length > 1e-8f) {
            g_normals[i].nx /= length;
            g_normals[i].ny /= length;
            g_normals[i].nz /= length;
        }
        else {
            g_normals[i].nx = 0.0f;
            g_normals[i].ny = 1.0f;
            g_normals[i].nz = 0.0f;
        }
    }
}

static bool loadOBJ(const std::string& filename) {
    std::ifstream file(filename.c_str());
    if (!file.is_open()) {
        std::cerr << "error: could not open obj file " << filename << std::endl;
        return false;
    }
    g_vertices.clear();
    g_indices.clear();
    g_texcoords.clear();
    std::vector<TexCoord> tempTexcoords;
    std::string line;
    while (std::getline(file, line)) {
        if (line.size() < 2)
            continue;
        std::stringstream ss(line);
        std::string prefix;
        ss >> prefix;
        if (prefix == "v") {
            Vertex v;
            ss >> v.x >> v.y >> v.z;
            g_vertices.push_back(v);
        }
        else if (prefix == "vt") {
            TexCoord tc;
            ss >> tc.u >> tc.v;
            tempTexcoords.push_back(tc);
        }
        else if (prefix == "f") {
            for (int i = 0; i < 3; i++) {
                std::string fToken;
                ss >> fToken;
                if (fToken.size() == 0)
                    break;
                int vIdx = 0, tIdx = 0, nIdx = 0;
                int slashCount = 0;
                for (char c : fToken) if (c == '/') slashCount++;
                if (slashCount == 0) {
                    vIdx = std::stoi(fToken);
                }
                else if (slashCount == 1) {
                    size_t slashPos = fToken.find('/');
                    vIdx = std::stoi(fToken.substr(0, slashPos));
                    tIdx = std::stoi(fToken.substr(slashPos + 1));
                }
                else {
                    size_t firstSlashPos = fToken.find('/');
                    size_t secondSlashPos = fToken.find('/', firstSlashPos + 1);
                    vIdx = std::stoi(fToken.substr(0, firstSlashPos));
                    if (secondSlashPos == firstSlashPos + 1) {
                        nIdx = std::stoi(fToken.substr(secondSlashPos + 1));
                    }
                    else {
                        tIdx = std::stoi(fToken.substr(firstSlashPos + 1, secondSlashPos - (firstSlashPos + 1)));
                        nIdx = std::stoi(fToken.substr(secondSlashPos + 1));
                    }
                }
                vIdx--;
                tIdx--;
                nIdx--;
                g_indices.push_back((unsigned int)vIdx);
                if (g_texcoords.empty())
                    g_texcoords.resize(g_vertices.size());
                if (tIdx >= 0 && (size_t)tIdx < tempTexcoords.size() && (size_t)vIdx < g_texcoords.size())
                    g_texcoords[vIdx] = tempTexcoords[tIdx];
            }
        }
    }
    file.close();
    if (tempTexcoords.empty()) {
        if (g_texcoords.size() < g_vertices.size())
            g_texcoords.resize(g_vertices.size());
        generateDefaultTexCoords();
    }
    std::cout << "Loaded OBJ: " << g_vertices.size() << " vertices, " << g_indices.size() / 3 << " faces.\n";
    computeNormals();
    return true;
}

bool loadTexture(const char* filename, GLuint& texID) {
    int width, height, channels;
    stbi_set_flip_vertically_on_load(true);
    unsigned char* data = stbi_load(filename, &width, &height, &channels, 0);
    if (!data) {
        std::cerr << "Failed to load texture image: " << filename << std::endl;
        return false;
    }
    glGenTextures(1, &texID);
    glBindTexture(GL_TEXTURE_2D, texID);
    GLenum format = GL_RGB;
    if (channels == 4) format = GL_RGBA;
    else if (channels == 1) format = GL_RED;
    glTexImage2D(GL_TEXTURE_2D, 0, format, width, height, 0, format, GL_UNSIGNED_BYTE, data);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T, GL_REPEAT);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_LINEAR);
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_LINEAR);
    stbi_image_free(data);
    glBindTexture(GL_TEXTURE_2D, 0);
    std::cout << "Texture loaded: " << filename << " (" << width << "x" << height << ", " << channels << " channels)\n";
    return true;
}

void reshape(int w, int h) {
    glViewport(0, 0, w, h);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    float top = g_nearPlane * tan(g_verticalFov * 0.5f * DEG2RAD);
    float bottom = -top;
    float right = g_nearPlane * tan(g_horizontalFov * 0.5f * DEG2RAD);
    float left = -right;
    glFrustum(left, right, bottom, top, g_nearPlane, g_farPlane);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
}

void drawFloorAndWalls(float size = 10.0f, float wallHeight = 5.0f) {
    if (g_textureEnabled) {
        glBindTexture(GL_TEXTURE_2D, g_textureID);
        glTexEnvf(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE);
    }
    else {
        glColor3f(0.6f, 0.6f, 0.6f);
    }
    glBegin(GL_QUADS);
    if (g_textureEnabled) glTexCoord2f(0, 0);
    glNormal3f(0, 1, 0); glVertex3f(-size, 0.0f, -size);
    if (g_textureEnabled) glTexCoord2f(4, 0);
    glNormal3f(0, 1, 0); glVertex3f(size, 0.0f, -size);
    if (g_textureEnabled) glTexCoord2f(4, 4);
    glNormal3f(0, 1, 0); glVertex3f(size, 0.0f, size);
    if (g_textureEnabled) glTexCoord2f(0, 4);
    glNormal3f(0, 1, 0); glVertex3f(-size, 0.0f, size);
    glEnd();
    glColor3f(0.8f, 0.8f, 0.8f);
    // Wall along +Z
    glBegin(GL_QUADS);
    if (g_textureEnabled) glTexCoord2f(0, 0);
    glNormal3f(0, 0, 1); glVertex3f(-size, 0.0f, size);
    if (g_textureEnabled) glTexCoord2f(4, 0);
    glNormal3f(0, 0, 1); glVertex3f(size, 0.0f, size);
    if (g_textureEnabled) glTexCoord2f(4, 1);
    glNormal3f(0, 0, 1); glVertex3f(size, wallHeight, size);
    if (g_textureEnabled) glTexCoord2f(0, 1);
    glNormal3f(0, 0, 1); glVertex3f(-size, wallHeight, size);
    glEnd();
    // Wall along -Z
    glBegin(GL_QUADS);
    if (g_textureEnabled) glTexCoord2f(0, 0);
    glNormal3f(0, 0, -1); glVertex3f(size, 0.0f, -size);
    if (g_textureEnabled) glTexCoord2f(4, 0);
    glNormal3f(0, 0, -1); glVertex3f(-size, 0.0f, -size);
    if (g_textureEnabled) glTexCoord2f(4, 1);
    glNormal3f(0, 0, -1); glVertex3f(-size, wallHeight, -size);
    if (g_textureEnabled) glTexCoord2f(0, 1);
    glNormal3f(0, 0, -1); glVertex3f(size, wallHeight, -size);
    glEnd();
    // Wall along +X
    glBegin(GL_QUADS);
    if (g_textureEnabled) glTexCoord2f(0, 0);
    glNormal3f(1, 0, 0); glVertex3f(size, 0.0f, size);
    if (g_textureEnabled) glTexCoord2f(4, 0);
    glNormal3f(1, 0, 0); glVertex3f(size, 0.0f, -size);
    if (g_textureEnabled) glTexCoord2f(4, 1);
    glNormal3f(1, 0, 0); glVertex3f(size, wallHeight, -size);
    if (g_textureEnabled) glTexCoord2f(0, 1);
    glNormal3f(1, 0, 0); glVertex3f(size, wallHeight, size);
    glEnd();
    // Wall along -X
    glBegin(GL_QUADS);
    if (g_textureEnabled) glTexCoord2f(0, 0);
    glNormal3f(-1, 0, 0); glVertex3f(-size, 0.0f, -size);
    if (g_textureEnabled) glTexCoord2f(4, 0);
    glNormal3f(-1, 0, 0); glVertex3f(-size, 0.0f, size);
    if (g_textureEnabled) glTexCoord2f(4, 1);
    glNormal3f(-1, 0, 0); glVertex3f(-size, wallHeight, size);
    if (g_textureEnabled) glTexCoord2f(0, 1);
    glNormal3f(-1, 0, 0); glVertex3f(-size, wallHeight, -size);
    glEnd();
}

void drawCow() {
    if (g_wireframe)
        glPolygonMode(GL_FRONT_AND_BACK, GL_LINE);
    else
        glPolygonMode(GL_FRONT_AND_BACK, GL_FILL);
    glBegin(GL_TRIANGLES);
    for (size_t i = 0; i < g_indices.size(); i++) {
        unsigned int idx = g_indices[i];
        glNormal3f(g_normals[idx].nx, g_normals[idx].ny, g_normals[idx].nz);
        if (g_textureEnabled)
            glTexCoord2f(g_texcoords[idx].u, g_texcoords[idx].v);
        glVertex3f(g_vertices[idx].x, g_vertices[idx].y, g_vertices[idx].z);
    }
    glEnd();
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    GLint viewport[4];
    glGetIntegerv(GL_VIEWPORT, viewport);
    int w = viewport[2], h = viewport[3];
    float top = g_nearPlane * tan(g_verticalFov * 0.5f * DEG2RAD);
    float bottom = -top;
    float right = g_nearPlane * tan(g_horizontalFov * 0.5f * DEG2RAD);
    float left = -right;
    glFrustum(left, right, bottom, top, g_nearPlane, g_farPlane);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();
    gluLookAt(g_cameraPosX, g_cameraPosY, g_cameraPosZ,
        g_cameraCenterX, g_cameraCenterY, g_cameraCenterZ,
        g_upX, g_upY, g_upZ);
    glLightModelfv(GL_LIGHT_MODEL_AMBIENT, g_globalAmbient);
    if (g_light0On) glEnable(GL_LIGHT0); else glDisable(GL_LIGHT0);
    if (g_light1On) glEnable(GL_LIGHT1); else glDisable(GL_LIGHT1);
    float light0Pos[4] = { 0.0f, 5.0f, 5.0f, 1.0f };
    float light0Diffuse[4] = { 1.0f, 1.0f, 1.0f, 1.0f };
    float light0Specular[4] = { 1.0f, 1.0f, 1.0f, 1.0f };
    glLightfv(GL_LIGHT0, GL_POSITION, light0Pos);
    glLightfv(GL_LIGHT0, GL_DIFFUSE, light0Diffuse);
    glLightfv(GL_LIGHT0, GL_SPECULAR, light0Specular);
    float light1Pos[4] = { -5.0f, 3.0f, 0.0f, 1.0f };
    float light1Diffuse[4] = { 1.0f, 0.5f, 0.5f, 1.0f };
    float light1Specular[4] = { 1.0f, 0.5f, 0.5f, 1.0f };
    glLightfv(GL_LIGHT1, GL_POSITION, light1Pos);
    glLightfv(GL_LIGHT1, GL_DIFFUSE, light1Diffuse);
    glLightfv(GL_LIGHT1, GL_SPECULAR, light1Specular);
    float matDiffuse[4] = { 0.8f, 0.8f, 0.8f, 1.0f };
    float matSpecular[4] = { 0.3f, 0.3f, 0.3f, 1.0f };
    float matShininess[1] = { 32.0f };
    glMaterialfv(GL_FRONT_AND_BACK, GL_DIFFUSE, matDiffuse);
    glMaterialfv(GL_FRONT_AND_BACK, GL_SPECULAR, matSpecular);
    glMaterialfv(GL_FRONT_AND_BACK, GL_SHININESS, matShininess);
    if (g_useFlatShading) glShadeModel(GL_FLAT); else glShadeModel(GL_SMOOTH);
    if (g_textureEnabled) {
        glEnable(GL_TEXTURE_2D);
        glBindTexture(GL_TEXTURE_2D, g_textureID);
        glTexEnvf(GL_TEXTURE_ENV, GL_TEXTURE_ENV_MODE, GL_MODULATE);
    }
    else {
        glDisable(GL_TEXTURE_2D);
    }
    drawFloorAndWalls();
    glColor3f(1.0f, 1.0f, 1.0f);
    for (size_t i = 0; i < g_cowPositions.size(); i++) {
        glPushMatrix();
        glTranslatef(g_cowPositions[i].tx, g_cowPositions[i].ty, g_cowPositions[i].tz);
        glRotatef(g_cowPositions[i].rx, 1, 0, 0);
        glRotatef(g_cowPositions[i].ry, 0, 1, 0);
        glRotatef(g_cowPositions[i].rz, 0, 0, 1);
        glTranslatef(g_modelPosX, g_modelPosY, g_modelPosZ);
        glRotatef(g_modelRotX, 1.0f, 0.0f, 0.0f);
        glRotatef(g_modelRotY, 0.0f, 1.0f, 0.0f);
        glRotatef(g_modelRotZ, 0.0f, 0.0f, 1.0f);
        drawCow();
        glPopMatrix();
    }
    glutSwapBuffers();
}

void keyboard(unsigned char key, int x, int y) {
    switch (key) {
    case 'w': g_cameraPosZ -= 0.1f; break;
    case 's': g_cameraPosZ += 0.1f; break;
    case 'a': g_cameraPosX -= 0.1f; break;
    case 'd': g_cameraPosX += 0.1f; break;
    case 'q': g_cameraPosY += 0.1f; break;
    case 'e': g_cameraPosY -= 0.1f; break;
    case 'i': g_modelPosZ -= 0.1f; break;
    case 'k': g_modelPosZ += 0.1f; break;
    case 'j': g_modelPosX -= 0.1f; break;
    case 'l': g_modelPosX += 0.1f; break;
    case 'u': g_modelPosY += 0.1f; break;
    case 'o': g_modelPosY -= 0.1f; break;
    case 'x': g_modelRotX += 5.0f; break;
    case 'X': g_modelRotX -= 5.0f; break;
    case 'y': g_modelRotY += 5.0f; break;
    case 'Y': g_modelRotY -= 5.0f; break;
    case 'z': g_modelRotZ += 5.0f; break;
    case 'Z': g_modelRotZ -= 5.0f; break;
    case 'f': g_wireframe = !g_wireframe; break;
    case 'v': g_verticalFov += 1.0f; if (g_verticalFov > 179.0f) g_verticalFov = 179.0f; break;
    case 'V': g_verticalFov -= 1.0f; if (g_verticalFov < 1.0f) g_verticalFov = 1.0f; break;
    case 'h': g_horizontalFov += 1.0f; if (g_horizontalFov > 179.0f) g_horizontalFov = 179.0f; break;
    case 'H': g_horizontalFov -= 1.0f; if (g_horizontalFov < 1.0f) g_horizontalFov = 1.0f; break;
    case 'n': g_nearPlane += 0.1f; break;
    case 'N': g_nearPlane -= 0.1f; if (g_nearPlane < 0.01f) g_nearPlane = 0.01f; break;
    case 'm': g_farPlane += 0.5f; break;
    case 'M': g_farPlane -= 0.5f; if (g_farPlane <= g_nearPlane) g_farPlane = g_nearPlane + 0.1f; break;
    case 'L': g_lightingEnabled = !g_lightingEnabled; if (g_lightingEnabled) glEnable(GL_LIGHTING); else glDisable(GL_LIGHTING); break;
    case '0': g_light0On = !g_light0On; break;
    case '1': g_light1On = !g_light1On; break;
    case 'g': g_useFlatShading = false; break;
    case 'G': g_useFlatShading = true; break;
    case 't': g_textureEnabled = !g_textureEnabled; break;
    case 'r': g_globalAmbient[0] += 0.05f; if (g_globalAmbient[0] > 1.0f) g_globalAmbient[0] = 1.0f; break;
    case 'R': g_globalAmbient[0] -= 0.05f; if (g_globalAmbient[0] < 0.0f) g_globalAmbient[0] = 0.0f; break;
    case 27: exit(0); break;
    }
    glutPostRedisplay();
}

void mouse(int button, int state, int x, int y) {
    if (button == GLUT_LEFT_BUTTON) {
        if (state == GLUT_DOWN) { g_mouseLeftDown = true; g_lastMouseX = x; g_lastMouseY = y; }
        else { g_mouseLeftDown = false; }
    }
}

void motion(int x, int y) {
    if (g_mouseLeftDown) {
        int dx = x - g_lastMouseX;
        int dy = y - g_lastMouseY;
        g_modelRotY += dx * 0.5f;
        g_modelRotX += dy * 0.5f;
        g_lastMouseX = x;
        g_lastMouseY = y;
        glutPostRedisplay();
    }
}

int main(int argc, char** argv) {
    std::string objFile = "cow.obj";
    std::string texFile = "cow-tex-fin.jpg";
    if (argc > 1) { objFile = argv[1]; }
    if (!loadOBJ(objFile)) {
        std::cerr << "Failed to load OBJ file: " << objFile << std::endl;
        return 1;
    }
    g_cowPositions.clear();
    g_cowPositions.push_back({ 0.0f, 0.0f, 0.0f, 0, 0, 0 });
    g_cowPositions.push_back({ 2.0f, 0.0f, 0.0f, 0, 90, 0 });
    g_cowPositions.push_back({ -2.0f, 0.0f, 0.0f, 0, -90, 0 });
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH);
    glutInitWindowSize(800, 600);
    glutCreateWindow("Assignment 3");
    glEnable(GL_DEPTH_TEST);
    glEnable(GL_LIGHTING);
    glEnable(GL_NORMALIZE);
    glEnable(GL_COLOR_MATERIAL);
    glEnable(GL_LIGHT0);
    if (!loadTexture(texFile.c_str(), g_textureID)) {
        std::cerr << "Warning: failed to load texture, continuing without it.\n";
        g_textureEnabled = false;
    }
    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutKeyboardFunc(keyboard);
    glutMouseFunc(mouse);
    glutMotionFunc(motion);
    glutMainLoop();
    return 0;
}
