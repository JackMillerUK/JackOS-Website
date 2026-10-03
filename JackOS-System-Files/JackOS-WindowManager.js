//JackOS-WindowManager.js
// This file is the Window Manager.
//
// Created during JackOS v5 Beta 3.
// Gradually replaces DesktopWindows,
// Desktop_initWindows()
// and other legacy window logic.

const WindowManager = {

  windows: new Map(),

  z: 100,

  register(config){

    const win =
      config.element;

    if(!win){
      console.warn(
        'WindowManager: Missing element for',
        config.id
      );
      return;
    }

    this.windows.set(
      config.id,
      {
        id: config.id,
        title:
          config.title ||
          config.id,

        element: win,

        minimised: false,

        maximised: false
      }
    );

    console.log(
      'Window registered:',
      config.id
    );

  },

  get(id){
    return this.windows.get(id);
  }

};

document.addEventListener(
  'DOMContentLoaded',
  () => {

    WindowManager.register({
      id:'explorer',
      title:'Explorer',
      element:
        document.getElementById(
          'explorer'
        )
    });

    WindowManager.register({
      id:'settings',
      title:'Settings',
      element:
        document.getElementById(
          'settingsWin'
        )
    });

    WindowManager.register({
      id:'browser',
      title:'Browser',
      element:
        document.getElementById(
          'browserWin'
        )
    });

    console.log(
      'WindowManager ready:',
      WindowManager.windows.size
    );

  }
);