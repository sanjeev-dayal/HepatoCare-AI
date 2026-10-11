import lightgbm as lgb
import numpy as np
from importlib.metadata import version

print("LightGBM:", version("lightgbm"))

X = np.random.rand(10000, 10).astype(np.float32)
y = np.random.randint(0, 6, 10000)

model = lgb.LGBMClassifier(
    objective="multiclass",
    num_class=6,
    n_estimators=20,
    device_type="gpu",
    verbosity=1
)

model.fit(X, y)
print("GPU test completed.")