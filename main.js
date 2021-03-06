"use strict"

var gl, canvas, colorpicker;

function main() {
    colorpicker = document.getElementById('dColor');
    canvas = document.getElementById('canvas');
    resizeCanvas();
    gl = canvas.getContext("webgl");

    if (!gl) {
        alert("Unable to initialize WebGL");
        return;
    }
    
    OBJ.downloadMeshes({'die':'dice.obj'}, init);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    //gl.cullFace(gl.BACK);
}

function init(mesh) {
    let die = mesh.die;

    main.vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(main.vs, vsSource);
    gl.compileShader(main.vs);

    if(!gl.getShaderParameter(main.vs, gl.COMPILE_STATUS)){
        alert(gl.getShaderInfoLog(main.vs));
        gl.deleteShader(main.vs);
        return;
    }

    main.fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(main.fs, fsSource);
    gl.compileShader(main.fs);

    if(!gl.getShaderParameter(main.fs, gl.COMPILE_STATUS)){
        alert(gl.getShaderInfoLog(main.fs));
        gl.deleteShader(main.fs);
        return;
    }

    main.program = gl.createProgram();
    gl.attachShader(main.program, main.vs);
    gl.attachShader(main.program, main.fs);
    gl.linkProgram(main.program);

    if(!gl.getProgramParameter(main.program, gl.LINK_STATUS)) {
        alert(gl.getShaderInfoLog(main.program));
        return;
    }

    main.programInfo = {
        program: main.program,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(main.program, 'aVertexPosition'),
            textureCoordinate: gl.getAttribLocation(main.program, 'aTexCoordinate'),
            vertexNormal: gl.getAttribLocation(main.program, 'aVertexNormal'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(main.program, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(main.program, 'uModelViewMatrix'),
            texture: gl.getUniformLocation(main.program, 'texture'),
            dieColor: gl.getUniformLocation(main.program, 'dieColor'),
            normalMatrix: gl.getUniformLocation(main.program, 'uNormalMatrix'),
            cameraPosition: gl.getUniformLocation(main.program, 'cameraPosition'),
            lightPosition: gl.getUniformLocation(main.program, 'lightPosition'),
            lightColor: gl.getUniformLocation(main.program, 'lightColor'),
            ambientColor: gl.getUniformLocation(main.program, 'ambientColor'),
            shininess: gl.getUniformLocation(main.program, 'shininess'),
        },
    };

    main.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, main.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(die.vertices), gl.STATIC_DRAW);

    main.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, main.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(die.indices), gl.STATIC_DRAW);

    main.texBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, main.texBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(die.textures), gl.STATIC_DRAW);

    main.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, main.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(die.vertexNormals), gl.STATIC_DRAW);

    main.vertexLength = die.vertices.length;
    main.indexLength = die.indices.length;
    main.texLength = die.textures.length;

    main.rotation = 0;
    main.lastFrame = 0;

    main.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, main.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,255,255]));

    main.image = new Image();
    main.image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, main.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, main.image);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    };
    main.image.src = "DiceTexture.png";

    console.log(die);
    requestAnimationFrame(draw);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.9;
}

function draw(now) {
    resizeCanvas();
    gl.clearColor(0.0,0.0,0.0,1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    now *= 0.001;
    const dt = now - main.lastFrame;
    main.lastFrame = now;
    main.rotation += dt;

    const fov = 45 * Math.PI / 180;
    const aspect = canvas.width / canvas.height;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fov, aspect, zNear, zFar);

    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, -6.0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, main.rotation, [1,0,0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, main.rotation, [0,1,0]);

    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, main.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, main.indexBuffer);

    gl.vertexAttribPointer(
        main.programInfo.attribLocations.vertexPosition,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(main.programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, main.texBuffer);
    gl.vertexAttribPointer(
        main.programInfo.attribLocations.textureCoordinate,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(main.programInfo.attribLocations.textureCoordinate);

    gl.bindBuffer(gl.ARRAY_BUFFER, main.normalBuffer);
    gl.vertexAttribPointer(
        main.programInfo.attribLocations.vertexNormal,
        3,
        gl.FLOAT,
        false,
        0,
        0
    );
    gl.enableVertexAttribArray(main.programInfo.attribLocations.vertexNormal);

    gl.useProgram(main.program);
    gl.uniformMatrix4fv(
        main.programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix
    );
    gl.uniformMatrix4fv(
        main.programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix
    );
    gl.uniformMatrix4fv(
        main.programInfo.uniformLocations.normalMatrix,
        false,
        normalMatrix
    );
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, main.texture);
    gl.uniform1i(main.programInfo.uniformLocations.texture, 0);
    
    const colorString = colorpicker.value.slice(1);
    const red = parseInt(colorString.slice(0, 2), 16);
    const green = parseInt(colorString.slice(2, 4), 16);
    const blue = parseInt(colorString.slice(4, 6), 16);
    
    gl.uniform3f(main.programInfo.uniformLocations.dieColor, red / 255, green / 255, blue / 255);
    gl.uniform3f(main.programInfo.uniformLocations.cameraPosition, 0, 0, 0);
    gl.uniform3f(main.programInfo.uniformLocations.lightPosition, 0, 5, 0);
    gl.uniform3f(main.programInfo.uniformLocations.ambientColor, 0.2, 0.2, 0.2);
    gl.uniform3f(main.programInfo.uniformLocations.lightColor, 0.7, 0.7, 0.7);
    gl.uniform1f(main.programInfo.uniformLocations.shininess, 32.0);

    gl.drawElements(gl.TRIANGLES, main.indexLength, gl.UNSIGNED_SHORT, 0);
    requestAnimationFrame(draw);
}


const vsSource = `
    precision highp float; 

    attribute vec3 aVertexPosition;
    attribute vec2 aTexCoordinate;
    attribute vec3 aVertexNormal;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;

    varying vec2 texcoord;
    varying vec3 normal;
    varying vec3 position;

    void main() {
        position = (uModelViewMatrix * vec4(aVertexPosition, 1.0)).xyz;
        normal = (uNormalMatrix * vec4(aVertexNormal, 0.0)).xyz;
        texcoord = vec2(aTexCoordinate.x, 1.0 - aTexCoordinate.y);
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition.xyz, 1.0);
    }
`;

const fsSource = `
    precision highp float;

    uniform sampler2D texture;
    uniform vec3 dieColor;
    uniform vec3 cameraPosition;
    uniform vec3 lightPosition;
    uniform vec3 lightColor;
    uniform vec3 ambientColor;
    uniform float shininess;

    varying vec2 texcoord;
    varying vec3 normal;
    varying vec3 position;

    void main() {
        vec3 texColor = texture2D(texture, texcoord).rgb;
        if(texColor.r > 0.5 && texColor.g > 0.5 && texColor.b > 0.5){
            texColor = dieColor;
        }
        else {
            texColor = vec3(1.0,1.0,1.0) - dieColor;
            texColor = step(0.5, texColor);
        }

        vec3 L = normalize(lightPosition - position);
        vec3 V = normalize(cameraPosition - position);
        vec3 N = normalize(normal);
        vec3 R = 2.0 * dot(L, N) * N - L;

        vec3 ambient = ambientColor * texColor;
        vec3 diffuse = lightColor * texColor * max(dot(L, N), 0.0);
        vec3 specular = lightColor * pow(max(dot(R, V), 0.0), shininess) * texColor;

        gl_FragColor = vec4(ambient + diffuse + specular, 1.0);
    }
`;
