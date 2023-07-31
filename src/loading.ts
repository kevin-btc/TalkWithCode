import * as vscode from "vscode";

const loading = (webview: vscode.Webview) => {
  webview.html = `
      <html>
        <head>
          <style>
            /* Center the text vertically and horizontally */
            .text-container {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100%;
            }
          </style>
        </head>
        <body>
          <div class="text-container">
            <h1>Loading...</h1>
          </div>
        </body>
      </html>
    `;
};

export default loading;
