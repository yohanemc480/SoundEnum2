export class NetworkFileLoader {
    _filePath = null;
    constructor(filePath)
    {
        this._filePath = filePath;
    }
    // パスに指定されているデータを非同期で取得してくる。
    FetchData()
    {
        return new Promise((resolve, reject) =>
        {
            const xhr = new XMLHttpRequest();

            xhr.open('GET', this._filePath, true);

            xhr.onload = function ()
            {
                if (xhr.status === 200)
                {
                    resolve(xhr.responseText);
                }
                else
                {
                    reject(new Error(`Failed to load file: ${xhr.statusText}`));
                }
            };

            xhr.onerror = function ()
            {
                reject(new Error('Network error occurred'));
            };

            xhr.send();
        });
    }
}