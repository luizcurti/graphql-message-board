import React from 'react';
import ReactDOM from 'react-dom/client';

jest.mock('react-dom/client', () => ({ createRoot: jest.fn() }));
jest.mock('./App', () => () => null);

describe('entry point', () => {
  it('renders <App /> in StrictMode into #root', () => {
    const render = jest.fn();
    (ReactDOM.createRoot as jest.Mock).mockReturnValue({ render });
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    jest.isolateModules(() => {
      require('./index');
    });

    expect(ReactDOM.createRoot).toHaveBeenCalledWith(root);
    expect(render).toHaveBeenCalledWith(
      <React.StrictMode>
        {expect.anything()}
      </React.StrictMode>,
    );
  });
});
