@echo off
chcp 65001 >nul
cd /d "%~dp0"
title NEON RIFT - Servidor LAN
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao foi encontrado.
  echo Instale a versao LTS em https://nodejs.org/ e execute este arquivo novamente.
  pause
  exit /b 1
)
if not exist node_modules\socket.io (
  echo Instalando os componentes do servidor pela primeira vez...
  call npm install
  if errorlevel 1 (echo Falha ao instalar dependencias. Verifique a internet e tente novamente.& pause & exit /b 1)
)
echo.
echo Servidor NEON RIFT iniciando na porta 3000...
echo Deixe esta janela aberta enquanto seus amigos jogam.
echo Para descobrir seu IP, abra outro CMD e digite: ipconfig
 echo.
node server.js
pause
