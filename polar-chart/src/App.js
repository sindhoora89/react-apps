import logo from './logo.svg';
import {useState} from "react";
import './App.css';
import PolarAreaChart from "./PolarAreaChart";

const App = () => {
  const [activeClassIndex, setActiveClassIndex] = useState(0);
  const [refreshChart, setRefreshChart] = useState(0);
    const items = [
        { label: 'Label A', value: 541 },
        { label: 'Label B', value: 109 },
        { label: 'Label C', value: 127 },
        { label: 'Label D', value: 21 },
        { label: 'Label E', value: 237 },
        { label: 'Label F', value: 17 },
        { label: 'Label G', value: 418 },
        { label: 'Label H', value: 191 },
        { label: 'Label I', value: 952 },
    ];
  return (
    <div className="App">

      <PolarAreaChart
          items={items}
          key={refreshChart}
          selectedIndex={activeClassIndex}
          onSelectIndex={setActiveClassIndex}
      />
    </div>
  );
}

export default App;
