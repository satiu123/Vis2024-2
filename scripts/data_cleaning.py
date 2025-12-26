#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
数据清洗脚本
功能: 清洗JobWanted.csv数据，处理缺失值、异常值、格式统一
"""

import pandas as pd
import numpy as np
import json
import re
from pathlib import Path

# 配置路径
BASE_DIR = Path(__file__).parent.parent
RAW_DATA_PATH = BASE_DIR / "data" / "raw" / "JobWanted.csv"
PROCESSED_DATA_PATH = BASE_DIR / "data" / "processed"

def parse_salary(salary_str):
    """
    解析薪资字段
    
    输入示例:
        - "5-10K" -> {"min": 5000, "max": 10000, "months": 12}
        - "15-30K·15薪" -> {"min": 15000, "max": 30000, "months": 15}
        - "面议" -> {"min": None, "max": None, "months": 12}
        - "130-180元/天" -> {"min": 3900, "max": 5400, "months": 12, "type": "daily"}
        - "15-20元/时" -> {"min": 2640, "max": 3520, "months": 12, "type": "hourly"}
    """
    if pd.isna(salary_str) or salary_str == "面议":
        return {"min": None, "max": None, "months": 12, "type": "monthly"}
    
    # 处理日薪和时薪
    if "元/天" in salary_str:
        numbers = re.findall(r'\d+', salary_str)
        if len(numbers) >= 2:
            # 假设一个月工作22天
            return {
                "min": int(numbers[0]) * 22,
                "max": int(numbers[1]) * 22,
                "months": 12,
                "type": "daily"
            }
    
    if "元/时" in salary_str:
        numbers = re.findall(r'\d+', salary_str)
        if len(numbers) >= 2:
            # 假设一天8小时，一个月工作22天
            return {
                "min": int(numbers[0]) * 8 * 22,
                "max": int(numbers[1]) * 8 * 22,
                "months": 12,
                "type": "hourly"
            }
    
    # 处理标准月薪格式
    numbers = re.findall(r'\d+', salary_str)
    months = 12  # 默认12薪
    
    if '薪' in salary_str:
        # 提取薪资倍数
        months_match = re.search(r'·(\d+)薪', salary_str)
        if months_match:
            months = int(months_match.group(1))
    
    if len(numbers) >= 2:
        min_salary = int(numbers[0])
        max_salary = int(numbers[1])
        
        # 判断单位（K表示千）
        if 'K' in salary_str or 'k' in salary_str:
            min_salary *= 1000
            max_salary *= 1000
        
        return {
            "min": min_salary,
            "max": max_salary,
            "months": months,
            "type": "monthly"
        }
    
    return {"min": None, "max": None, "months": 12, "type": "monthly"}


def parse_experience(exp_code):
    """
    解析经验要求编码
    根据数据实际情况推断的映射规则
    """
    exp_mapping = {
        'Eby': 0,  # 应届生/无经验
        'Eas': 1,  # 1-3年
        'EdD': 2,  # 3-5年
        'Eqh': 3,  # 5-10年
        'EzN': 4,  # 10年以上
        'EKk': -1  # 未知
    }
    return exp_mapping.get(exp_code, -1)


def parse_education(edu_code):
    """
    解析学历要求编码
    根据数据实际情况推断的映射规则
    """
    edu_mapping = {
        'GP': 0,  # 不限/中专
        'GI': 1,  # 大专
        'Gx': 2,  # 本科
        'Gm': 3,  # 硕士
        'Gd': 4   # 博士
    }
    return edu_mapping.get(edu_code, -1)


def clean_data():
    """主数据清洗函数"""
    print("=" * 60)
    print("开始数据清洗...")
    print("=" * 60)
    
    # 1. 读取原始数据
    print(f"\n1. 读取数据: {RAW_DATA_PATH}")
    df = pd.read_csv(RAW_DATA_PATH)
    print(f"   原始数据shape: {df.shape}")
    print(f"   列名: {list(df.columns)}")
    
    # 2. 查看基本信息
    print("\n2. 数据基本信息:")
    print(df.head(10))
    print("\n缺失值统计:")
    print(df.isnull().sum())
    
    # 3. 解析薪资字段
    print("\n3. 解析薪资字段...")
    df['salary_parsed'] = df['salary'].apply(parse_salary)
    df['salary_min'] = df['salary_parsed'].apply(lambda x: x['min'] if x else None)
    df['salary_max'] = df['salary_parsed'].apply(lambda x: x['max'] if x else None)
    df['salary_months'] = df['salary_parsed'].apply(lambda x: x['months'] if x else 12)
    df['salary_avg'] = (df['salary_min'] + df['salary_max']) / 2
    
    # 计算年薪（月薪 * 薪资月数）
    df['annual_salary'] = df['salary_avg'] * df['salary_months'] / 12
    
    print(f"   成功解析 {df['salary_min'].notna().sum()} 条薪资记录")
    print(f"   薪资范围: {df['salary_min'].min():.0f} - {df['salary_max'].max():.0f}")
    
    # 4. 解析经验和学历
    print("\n4. 解析经验和学历编码...")
    df['experience_level'] = df['experience'].apply(parse_experience)
    df['education_level'] = df['education'].apply(parse_education)
    
    print(f"   经验等级分布: {df['experience_level'].value_counts().to_dict()}")
    print(f"   学历等级分布: {df['education_level'].value_counts().to_dict()}")
    
    # 5. 清理异常值
    print("\n5. 清理异常值...")
    # 移除薪资异常值（月薪小于1000或大于100000）
    salary_mask = (df['salary_min'].isna()) | \
                  ((df['salary_min'] >= 1000) & (df['salary_max'] <= 100000))
    df_clean = df[salary_mask].copy()
    print(f"   移除 {len(df) - len(df_clean)} 条薪资异常数据")
    
    # 6. 保存清洗后的数据
    print("\n6. 保存清洗后的数据...")
    PROCESSED_DATA_PATH.mkdir(parents=True, exist_ok=True)
    output_file = PROCESSED_DATA_PATH / "cleaned_data.csv"
    df_clean.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"   已保存到: {output_file}")
    print(f"   清洗后数据shape: {df_clean.shape}")
    
    # 7. 生成数据统计摘要
    print("\n7. 生成数据摘要...")
    summary = {
        "total_records": int(len(df_clean)),
        "total_jobs": int(df_clean['JobTitle'].nunique()),
        "total_companies": int(df_clean['company'].nunique()),
        "total_cities": int(df_clean['city'].nunique()),
        "total_industries": int(df_clean['companyType'].nunique()),
        "salary_stats": {
            "min": float(df_clean['salary_min'].min()) if df_clean['salary_min'].notna().any() else None,
            "max": float(df_clean['salary_max'].max()) if df_clean['salary_max'].notna().any() else None,
            "mean": float(df_clean['salary_avg'].mean()) if df_clean['salary_avg'].notna().any() else None,
            "median": float(df_clean['salary_avg'].median()) if df_clean['salary_avg'].notna().any() else None
        }
    }
    
    summary_file = PROCESSED_DATA_PATH / "data_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"   数据摘要已保存到: {summary_file}")
    print(f"\n   摘要信息:")
    print(f"   - 总记录数: {summary['total_records']:,}")
    print(f"   - 职位种类: {summary['total_jobs']:,}")
    print(f"   - 企业数量: {summary['total_companies']:,}")
    print(f"   - 城市数量: {summary['total_cities']}")
    print(f"   - 行业数量: {summary['total_industries']}")
    print(f"   - 平均薪资: {summary['salary_stats']['mean']:.0f} 元/月")
    
    print("\n" + "=" * 60)
    print("数据清洗完成！")
    print("=" * 60)
    
    return df_clean


if __name__ == "__main__":
    clean_data()
