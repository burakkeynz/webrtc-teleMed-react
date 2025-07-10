import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { createStore } from "redux"; //get createStore method so we can make a redux store, configureStore bunun redux tool-kit karşılığı
import { Provider } from "react-redux"; //get the Provider component to wrap around our App
import rootReducer from "./redux-elements/reducers/rootReducer";
import "bootstrap/dist/css/bootstrap.min.css";

const theStore = createStore(rootReducer);
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={theStore}>
    <App />
  </Provider>
);
